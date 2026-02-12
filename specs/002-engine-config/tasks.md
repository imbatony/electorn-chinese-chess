# 任务: 引擎配置规范化与自定义引擎支持

**输入**: 来自 `/specs/main/` 的设计文档
**前置条件**: plan.md ✅、spec.md ✅、research.md ✅、data-model.md ✅、contracts/ ✅

## 格式: `[ID] [P?] [Story] 描述`
- **[P]**: 可以并行运行 (不同文件, 无依赖关系)
- **[Story]**: 此任务属于哪个用户故事

---

## 阶段 1: 设置 (共享基础设施)

**目的**: 创建所有用户故事共享的类型定义

- [X] T001 [US2/US6] 在 `src/main/engine-types.ts` 中创建所有类型定义
  - `EngineConfig`, `EngineConfigFile`, `EngineProbeResult`, `EngineOption` (US2)
  - `Info`, `InfoAndMove`, `OnInfoCallback` (US6)
  - `parseInfoLine` 函数签名导出 (US6)
  - 参考: `data-model.md` 全部 6 个实体, `contracts/engine-config-service-api.md` 类型定义部分

**检查点**: 类型编译通过, 无运行时代码

---

## 阶段 2: US1 - 删除 Cyclone 引擎 (优先级: P1)

**目标**: 从代码和资源中彻底移除 Cyclone 引擎的所有引用
**独立测试**: 全局搜索 `CYCLONE` 或 `cyclone` 返回零结果 (SC-001)
**验收**: spec.md US1 场景 1-3

- [X] T002 [P] [US1] 从 `src/common/constants.ts` 中移除 `ENGINE_KEY_CYCLONE` 和 `ENGINE_NAME_CYCLONE` 常量
- [X] T003 [P] [US1] 从 `src/main/UCCI.ts` 中移除 Cyclone 相关代码
  - 移除 `GetUCCIEngine()` 中 Cyclone 的 case 分支
  - 移除 `GetAllEngineKeyNames()` 返回值中的 Cyclone 条目
  - 注: `GetUCCIEngine` 和 `GetAllEngineKeyNames` 函数本身在阶段 8 才移除, 此处仅移除 Cyclone 相关逻辑
- [X] T004 [P] [US1] 从 `test/UCCI.test.ts` 中移除 Cyclone 相关测试用例
- [X] T005 [P] [US1] 删除 `assets/engine/cyclone/` 目录
  - 更新 `.gitignore` (如需要)
  - 验证 `forge.config.js` 的 `extraResource` 配置不引用 cyclone

**检查点**: `grep -r "cyclone\|CYCLONE" --include="*.ts"` 返回零结果; 编译通过; 构建产物不含 cyclone

---

## 阶段 3: US2 - 引擎配置数据持久化 (优先级: P1, 基础)

**目标**: 使用 `engines.json` 统一管理引擎配置, 替换硬编码逻辑
**独立测试**: 删除 `engines.json` → 启动 → 自动生成默认配置 → 重启 → 正确加载
**验收**: spec.md US2 场景 1-3

**⚠️ 关键**: US3、US4、US5 均依赖此阶段完成

### 测试 (TDD)

- [X] T006 [P] [US2] 在 `test/EngineConfigService.test.ts` 中编写 EngineConfigService 单元测试
  - `init()`: 首次启动生成默认配置 (3 个内置引擎, version='1.0')
  - `init()`: 已有合法配置时正确加载
  - `init()`: 配置损坏时备份为 `.bak` 并重建
  - `getAllEngines()`: 返回数组副本
  - `getEngineById()`: 存在/不存在两种情况
  - `resolveEnginePath()`: 内置引擎拼接 basePath, 自定义引擎返回绝对路径
  - `isEngineAvailable()`: 内置引擎始终 true, 自定义引擎校验 fs.existsSync
  - mock: `fs.readFileSync`, `fs.writeFileSync`, `fs.existsSync`, `electron.app.getPath`

### 实施

- [X] T007 [US2] 在 `src/main/EngineConfigService.ts` 中创建 EngineConfigService 类骨架
  - 单例模式 (`private constructor`, `static getInstance()`)
  - 属性: `configPath`, `basePath`, `config: EngineConfigFile`
  - 默认配置常量: 3 个内置引擎 (参考 `data-model.md` 默认配置 JSON)
- [X] T008 [US2] 实现 `init()` 方法 (依赖 T007)
  - 加载/生成/备份逻辑 (FR-002, FR-003, FR-010)
  - `configPath` = `path.join(app.getPath('userData'), 'engines.json')`
  - `basePath` = `path.join(process.resourcesPath, 'assets')` (生产) 或项目根目录 `assets/` (开发)
- [X] T009 [US2] 实现查询方法 (依赖 T007)
  - `getAllEngines()`, `getEngineById()`, `getDefaultEngineId()`
  - `resolveEnginePath()`, `isEngineAvailable()`
- [X] T010 [US2] 实现 `save()` 私有方法 (依赖 T007)
  - `JSON.stringify(config, null, 2)` 写入 `configPath`
- [X] T011 [US2] 修改 `src/main/index.ts`: 在 `app.on('ready')` 中初始化 EngineConfigService (依赖 T008)
  - 在 `createWindow()` 之前调用 `EngineConfigService.getInstance().init()`
- [X] T012 [US2] 修改 `src/main/feijiang.ts`: 替换 `GetUCCIEngine()` 调用 (依赖 T009)
  - `getEngineByKey()` 改为从 EngineConfigService 获取配置
  - 使用 `resolveEnginePath()` 获取完整路径
  - 使用 `config.protocol` 替代硬编码协议判断
  - 参考: `contracts/engine-config-service-api.md` feijiang.ts 修改部分
- [X] T013 [US2] 修改 `src/main/menu.ts`: 引擎菜单动态化 (依赖 T009)
  - 替换 `GetAllEngineKeyNames()` 调用
  - 遍历 `getAllEngines()` 生成红方/黑方子菜单
  - 使用 `config.id` 作为 key, `config.name` 作为 label

**检查点**: 删除 engines.json → 启动应用 → 自动生成 → 菜单显示 3 个内置引擎 → 关闭 → 重启 → 配置持久化成功

---

## 阶段 4: US3 - 加载自定义引擎 (优先级: P1) 🎯 MVP

**目标**: 用户通过菜单加载第三方 UCCI/UCI 引擎
**独立测试**: 下载 Pikafish → 通过菜单加载 → 选为黑方 → 正常对局
**验收**: spec.md US3 场景 1-4

### 测试

- [X] T014 [P] [US3] 在 `test/EngineConfigService.test.ts` 中新增 probeEngine/addCustomEngine 测试
  - `probeEngine()`: UCI 引擎返回 `{ success: true, protocol: 'uci', name: '...' }`
  - `probeEngine()`: UCCI 引擎返回 `{ success: true, protocol: 'ucci', name: '...' }`
  - `probeEngine()`: 非引擎 EXE 超时返回 `{ success: false, error: '...' }`
  - `addCustomEngine()`: 成功添加, ID 格式 `custom-{timestamp}`
  - `addCustomEngine()`: 路径重复抛出异常
  - mock: `child_process.spawn`, 模拟 stdout 输出

### 实施

- [X] T015 [US3] 实现 `probeEngine()` 方法 (依赖 T007)
  - 启动子进程, 先发 `uci` (3s 超时) → 等 `uciok`
  - 失败则发 `ucci` (2s 超时) → 等 `ucciok`
  - 提取 `id name` 行中引擎名称 (FR-005, FR-006)
  - 总超时 5 秒, 超时 kill 进程
  - 参考: research.md 决策 #1 (UCI-first 探测)
- [X] T016 [US3] 实现 `addCustomEngine()` 方法 (依赖 T010, T015)
  - 检查路径重复 (FR-007)
  - 生成 `custom-{Date.now()}` 格式 ID (research.md 决策 #6)
  - push 到 `config.engines`, 调用 `save()`
- [X] T017 [US3] 在 `src/main/menu.ts` 中添加 "引擎设置 → 加载引擎" 子菜单 (依赖 T013)
  - 点击 → `dialog.showOpenDialog({ filters: [{ name: 'Engine', extensions: ['exe'] }] })`
  - 选择文件 → `probeEngine()` → 成功 → `addCustomEngine()` → 刷新菜单
  - 失败 → `Notification` 提示 "无法识别引擎协议"
  - 路径重复 → `Notification` 提示 "该引擎已存在"
- [X] T018 [US3] 实现菜单动态刷新 (依赖 T017)
  - `addCustomEngine` 后调用 `Menu.setApplicationMenu(Menu.buildFromTemplate(...))`
  - 新引擎立即出现在红方/黑方子菜单中, 无需重启 (FR-007)
  - 参考: research.md 决策 #8 (Menu.buildFromTemplate 重建)

**检查点**: 通过菜单加载 Pikafish (UCI 引擎) → 菜单立即显示 → 选为黑方 → 正常走棋 → 重启应用引擎仍在

---

## 阶段 5: US4 - 移除自定义引擎 (优先级: P2)

**目标**: 用户可移除已加载的自定义引擎
**独立测试**: 加载自定义引擎 → 通过管理菜单移除 → 验证菜单和配置已更新
**验收**: spec.md US4 场景 1-3

- [X] T019 [US4] 实现 `removeCustomEngine()` 方法 (依赖 T007)
  - 校验: 内置引擎不可移除 (FR-008)
  - 从 `config.engines` 中删除, 调用 `save()`
- [X] T020 [US4] 在 `src/main/menu.ts` 中添加 "引擎设置 → 管理引擎" 子菜单 (依赖 T013, T019)
  - 子菜单列出 `builtin=false` 的引擎, 每项格式: `{name} ❌ 移除`
  - 点击 → 检查引擎是否在使用 → 未使用 → `removeCustomEngine()` → 刷新菜单
  - 正在使用 → `Notification` 提示 "该引擎正在使用中, 请先切换到其他引擎"
- [X] T021 [US4] 在 `src/main/feijiang.ts` 中添加引擎使用状态查询 (依赖 T012)
  - 导出函数 `isEngineInUse(engineId: string): boolean`
  - 检查 `engines` Map 中是否存在该 key 的活跃引擎实例

**检查点**: 加载一个自定义引擎 → 管理引擎菜单中出现 → 移除 → 菜单更新 → 重启后仍不显示

---

## 阶段 6: US5 - 引擎路径失效处理 (优先级: P3)

**目标**: 优雅处理自定义引擎 EXE 文件不存在的情况
**独立测试**: 加载引擎 → 手动删除 EXE → 重启 → 引擎标记为不可用
**验收**: spec.md US5 场景 1-2

- [X] T022 [US5] 修改 `src/main/menu.ts`: 不可用引擎显示灰色 (依赖 T013)
  - 遍历 `getAllEngines()` 时, 对自定义引擎调用 `isEngineAvailable()`
  - 不可用: `label: '{name} (不可用)'`, `enabled: false` (FR-009)
- [X] T023 [US5] 修改 `src/main/menu.ts`: 点击不可用引擎时的通知 (依赖 T022)
  - 即使 `enabled: false`, Electron 菜单仍可能通过其他路径触发
  - 在 click handler 中增加 `isEngineAvailable` 检查
  - 不可用时 `Notification` 提示 "引擎文件不存在, 请重新加载或移除该引擎"

**检查点**: 删除自定义引擎 EXE → 重启应用 → 引擎名称灰色 + "(不可用)" → 点击无反应

---

## 阶段 7: US6 - 引擎集成代码优化 (优先级: P1)

**目标**: 修复 info 解析 bug, 提取 `parseInfoLine()` 纯函数, 新增 `onInfo` 回调和分析模式
**独立测试**: 发送 `go movetime 3000` → `pvList` 数据正确 → `onInfo` 回调被调用
**验收**: spec.md US6 场景 1-4

### 测试 (TDD — 先写测试)

- [X] T024 [P] [US6] 在 `test/UCCI.test.ts` 中编写 `parseInfoLine()` 单元测试 (SC-006)
  - 标准 UCI info 行: `info depth 10 seldepth 15 score cp 35 nodes 12345 nps 67890 time 183 pv e2e4 d7d5 g1f3`
  - UCCI info 行: `info depth 8 score 120 pv h2e2 h9g7` (UCCI 无 cp/mate 前缀, score 直接为 centipawn)
  - `score mate 5` → `{ scoreType: 'mate', score: 5 }`
  - `score cp -150` → `{ scoreType: 'cp', score: -150 }`
  - `multipv 2` → `{ multipv: 2 }`
  - 变长 pv: 1 步、3 步、10 步的 pv 行
  - 无 pv 的 info 行 → 返回 `null` (不含关键字段时)
  - 非 info 行 → 返回 `null`
- [X] T025 [P] [US6] 在 `test/UCCI.test.ts` 中编写 `pvList` 累积和 `onInfo` 回调测试 (SC-007)
  - 模拟多行 info + bestmove 的 stdout 输出
  - 验证 `infoAndMove()` 返回的 `pvList.length` 等于 info 行数
  - 验证 `onInfo` 回调被调用次数 = info 行数
  - 验证每次回调参数为有效 `Info` 对象

### 实施

- [X] T026 [US6] 在 `src/main/UCCI.ts` 中实现 `parseInfoLine()` 纯函数 (依赖 T001)
  - 导出为模块级函数 (非类方法)
  - 关键字驱动线性扫描: tokenize → 遍历 token → switch/if-else 填充 Info 字段
  - 处理 `score cp <N>` 和 `score mate <N>` (两个 token 消耗)
  - pv 关键字后的所有 token 都是走法 (变长)
  - UCCI 兼容: 若 `score` 后既非 `cp` 也非 `mate`, 直接视为 centipawn
  - 返回 `Info | null`
  - 参考: research.md 决策 #9 (关键字驱动线性扫描)
- [X] T027 [US6] 重构 `src/main/UCCI.ts` 中 `infoAndMove()` 方法 (依赖 T026)
  - 替换内联 info 解析为 `parseInfoLine()` 调用
  - 修复: 将解析后的 `Info` 对象 push 到 `pvList` (FR-012)
  - 修复: `bestmove` 行解析提取 `ponder` 字段
  - 填充 `InfoAndMove.nodes/nps/time` (从最后一条 Info 提取)
- [X] T028 [US6] 在 `infoAndMove()` 中添加 `onInfo` 可选回调参数 (依赖 T027)
  - 方法签名: `infoAndMove(fen, option, onInfo?: OnInfoCallback)`
  - 每调用 `parseInfoLine()` 返回非 null 结果时, 调用 `onInfo(info)` (FR-013)
  - 现有调用方不传 `onInfo`, 行为不变 (向后兼容)
  - 参考: research.md 决策 #10 (回调参数模式)
- [X] T029 [US6] 实现 `analyzePosition()` 和 `stopAnalysis()` (依赖 T028)
  - `analyzePosition(fen, onInfo)`: 发送 `position fen ...` + `go infinite`
  - 注册临时 stdout handler, 逐行调用 `parseInfoLine()` + `onInfo`
  - `stopAnalysis()`: 发送 `stop`, 等待 `bestmove`, 返回 `InfoAndMove`
  - 参考: research.md 决策 #11 (analyzePosition/stopAnalysis 设计)

**检查点**: 全部 parseInfoLine 测试通过; 使用象眼/佳佳引擎走棋, pvList 数据正确; onInfo 回调被调用

---

## 阶段 8: 清理与完善

**目的**: 横切关注点和最终验证

- [X] T030 [US1] 从 `src/main/UCCI.ts` 中移除 `GetUCCIEngine()` 和 `GetAllEngineKeyNames()` 函数 (依赖 T012, T013)
  - 确认所有调用方已迁移到 EngineConfigService
- [X] T031 [P] 运行 `npx knip` 检测死代码 (依赖 T030)
  - 修复所有 knip 报告的未使用导出和依赖
- [X] T032 [P] 运行 ESLint/Prettier 格式检查并修复
- [X] T033 运行完整测试套件: `npx jest --coverage` (依赖 T031, T032)
  - 确保覆盖率不降低
  - parseInfoLine 覆盖率 100% (SC-006)
- [X] T034 执行 `quickstart.md` 手动验证 (依赖 T033)
  - 7 个验证场景 + info 解析验证
  - 记录每个场景的通过/失败状态

**检查点**: 全部测试绿色, knip 零报告, quickstart 全部通过

---

## 依赖关系与执行顺序

### 阶段依赖关系

```
阶段 1 (设置)
  │
  ├──→ 阶段 2 (US1: 删除 Cyclone) ─── 无后续依赖, 可随时执行
  │
  └──→ 阶段 3 (US2: 配置持久化) ─── 基础阶段, 阻塞 US3/US4/US5
          │
          ├──→ 阶段 4 (US3: 加载引擎) ─── MVP
          │       │
          │       └──→ 阶段 5 (US4: 移除引擎)
          │
          └──→ 阶段 6 (US5: 路径失效)
  
  └──→ 阶段 7 (US6: 代码优化) ─── 与 US2 无强依赖, 仅共享 engine-types.ts
  
  阶段 8 (清理) ─── 依赖阶段 2-7 全部完成
```

### 任务级依赖图

```
T001 (engine-types.ts)
  ├──→ T002, T003, T004, T005 (US1, 全部可并行)
  ├──→ T006 (US2 测试)
  │     └──→ T007 → T008, T009, T010 (可并行)
  │                   │     │
  │                   T011  T012 → T013
  │                                 │
  │                   T014          T017 → T018
  │                    └──→ T015 → T016
  │
  │                   T019 → T020
  │                   T021
  │                   T022 → T023
  │
  ├──→ T024, T025 (US6 测试, 可并行)
  │     └──→ T026 → T027 → T028 → T029
  │
  └──→ T030 → T031, T032 (可并行) → T033 → T034
```

### 并行机会

| 并行组 | 任务 | 条件 |
|--------|------|------|
| A | T002, T003, T004, T005 | 阶段 2 内, 不同文件 |
| B | T006, T024, T025 | 测试可并行编写 |
| C | 阶段 2 (US1) 与 阶段 7 (US6) | 无代码依赖 |
| D | T014 与 T013 | 测试和菜单实现可并行 |
| E | T031, T032 | 清理阶段内并行 |

### 实施策略

1. **T001** → 立即开始, 全部类型定义
2. **T002-T005 + T024-T025** → 并行: Cyclone 清理 + US6 测试编写
3. **T006 → T007-T013** → 顺序: EngineConfigService 完整实现
4. **T026-T029** → 顺序: parseInfoLine → infoAndMove 重构 → onInfo → 分析模式
5. **T014-T018** → 顺序: probeEngine/addCustomEngine 实现和菜单集成
6. **T019-T021** → 顺序: 移除引擎功能
7. **T022-T023** → 顺序: 路径失效处理
8. **T030-T034** → 最终清理和验证

**预计总任务数**: 34 个任务, 8 个阶段
