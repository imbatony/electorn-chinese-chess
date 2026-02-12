# 实施计划: 引擎配置规范化与自定义引擎支持

**分支**: `main` | **日期**: 2026-02-12 | **规范**: [spec.md](spec.md)
**输入**: 来自 `/specs/main/spec.md` 的功能规范

## 摘要

规范化引擎配置管理, 实现以下核心目标:
1. **删除 Cyclone 引擎**: 移除代码引用和资源文件
2. **引擎配置持久化**: 使用 `engines.json` 统一管理内置和自定义引擎
3. **自定义引擎加载**: 用户通过菜单选择 EXE 文件, 自动检测 UCI/UCCI 协议
4. **引擎管理**: 支持移除自定义引擎和路径失效处理
5. **引擎集成代码优化**: 修复 info 解析 bug, 提取 `parseInfoLine()` 纯函数,
   新增 `onInfo` 流式回调和 `analyzePosition/stopAnalysis` 分析模式接口,
   为后续局面分析功能做好技术准备

技术方案: 新建 `EngineConfigService` 单例服务 (参照 `GameRecordService` 模式),
负责引擎配置 CRUD 和协议检测. 重构 `ChessEngine` 的 `infoAndMove()` 方法,
修复 info 行解析 bug 并提取为独立纯函数 `parseInfoLine()`.
协议检测策略参考
[public-Xiangqi Engine.java](https://github.com/sojourners/public-Xiangqi)
的 `test()` 方法, 按 UCI → UCCI 顺序尝试握手.

**协议参考文档**:
- UCCI 规范: https://www.xqbase.com/protocol/cchess_ucci.htm
- UCI 规范: https://www.xqbase.com/protocol/uci.htm
- Pikafish UCI 实现: https://github.com/official-pikafish/Pikafish/wiki/UCI-&-Commands

## 技术背景

**语言/版本**: TypeScript 5.x, 严格模式 (`noImplicitAny`)
**主要依赖**: Electron 28 (主进程), React 17 + react-konva (渲染进程)
**存储**: 文件 (`engines.json` in `%APPDATA%/飞将象棋/`)
**测试**: Jest 30 + ts-jest
**目标平台**: Windows (引擎 EXE 为 Win32 二进制)
**项目类型**: Electron 桌面应用 (main/renderer/common 进程分离)
**性能目标**: 60fps 棋盘渲染, 引擎通信子进程独立, 配置 I/O 异步
**约束条件**: 协议握手超时 5 秒, 配置加载 <500ms, 内存 <200MB
**规模/范围**: 用户管理 3~20 个引擎, 配置文件 <50KB

**现有引擎代码问题** (来自代码分析):
- `infoAndMove()` 中 `depth` 和 `nps` 赋值到 `infoObj.score` (bug)
- 解析后的 `infoObj` 从未 push 到 `pvList` (bug)
- `pv` 按固定步长 2 解析, 但 pv 为变长字段 (bug)
- 不支持 `score cp/mate`, `seldepth`, `multipv`, `time` 等标准字段
- 无流式 info 推送机制, 无 `go infinite` 分析模式支持

## 章程检查

*门控: 阶段 0 研究前通过 ✅ | 阶段 1 设计后重新检查 ✅*

| 原则 | 要求 | 合规状态 |
|------|------|----------|
| I. 代码质量 | TypeScript 严格类型, ESLint/Prettier 零错误, Knip 清理死代码 | ✅ 新增 `EngineConfig`/`Info` 类型定义; FR-001 移除 Cyclone 死代码; `parseInfoLine()` 修复类型安全 |
| II. 测试纪律 | 核心逻辑单元测试, 引擎通信集成测试 | ✅ `EngineConfigService` CRUD + `parseInfoLine()` 需 100% 覆盖率单元测试; `analyzePosition` 需集成测试 |
| III. UX 一致性 | 中文菜单, 通知措辞一致, 灰色标记不可用 | ✅ 所有菜单文本中文; 通知统一使用 Electron Notification |
| IV. 性能标准 | 配置 I/O 异步, 引擎通信子进程, 不阻塞渲染 | ✅ `engines.json` 读写在主进程启动时; 引擎探测 async; `onInfo` 在 stdout handler 中同步调用不阻塞 |
| V. 简洁架构 | main/ 处理系统操作, common/ 无 Electron 依赖, IPC 常量化, YAGNI | ✅ `EngineConfigService` 在 main/; `parseInfoLine()` 为纯函数可放 common/ 或 main/; 无新依赖 |

**注**: `parseInfoLine()` 虽然与 Electron 无关, 但因其仅被 `ChessEngine` (main/) 调用,
放在 `src/main/UCCI.ts` 中作为模块级导出函数, 保持就近原则.
若未来 renderer 需要 info 解析, 再迁移到 `common/`.

## 项目结构

### 文档(此功能)

```
specs/main/
├── plan.md              # 此文件
├── research.md          # 阶段 0 输出 ✅
├── data-model.md        # 阶段 1 输出 ✅
├── quickstart.md        # 阶段 1 输出 ✅
├── contracts/           # 阶段 1 输出 ✅
│   ├── engine-config-service-api.md
│   └── ipc-channels.md
└── tasks.md             # 阶段 2 输出 ✅
```

### 源代码(仓库根目录)

```
src/
├── common/
│   ├── constants.ts          # [修改] 移除 CYCLONE 常量
│   └── ...
├── main/
│   ├── EngineConfigService.ts  # [新增] 引擎配置服务 (单例)
│   ├── engine-types.ts         # [新增] 引擎配置 + 搜索信息相关类型定义
│   ├── UCCI.ts                 # [修改] 移除 Cyclone 引用, 移除 GetUCCIEngine/GetAllEngineKeyNames,
│   │                           #        重构 infoAndMove() 的 info 解析,
│   │                           #        提取 parseInfoLine() 纯函数,
│   │                           #        新增 onInfo 回调 + analyzePosition/stopAnalysis
│   ├── feijiang.ts             # [修改] getEngineByKey 改用 EngineConfigService
│   ├── menu.ts                 # [修改] 引擎菜单动态化, 新增引擎设置子菜单
│   ├── index.ts                # [修改] 启动时初始化 EngineConfigService
│   └── ...
├── renderer/
│   └── ...                     # 无变更

test/
├── UCCI.test.ts                # [修改] 移除 Cyclone 测试, 新增 parseInfoLine 单元测试
├── EngineConfigService.test.ts # [新增] 配置服务单元测试
└── ...

assets/engine/
├── ElephantEye/                # 保留
├── gg20180531/                 # 保留
├── sachess1.6/                 # 保留
└── cyclone/                    # [删除]
```

**结构决策**: 沿用现有 Electron 单一项目结构 (main/renderer/common).
新增文件均在 `src/main/` 中, 遵循章程原则 V 的进程分离模型.
`engine-types.ts` 独立于 `EngineConfigService.ts` 以保持类型可共享性.
`parseInfoLine()` 作为 `UCCI.ts` 的模块级导出函数, 与 `ChessEngine` 类同文件.

## 复杂度跟踪

无章程违规, 无需复杂度证明.

新增 `EngineConfigService` 是现有 `GameRecordService` 模式的直接复用,
不引入新的架构模式或第三方依赖.
`parseInfoLine()` 是对现有内联逻辑的提取和修复, 降低了复杂度.
`analyzePosition/stopAnalysis` 复用现有 `send/sendAsync` 基础设施,
仅新增 `go infinite` 命令变体.
