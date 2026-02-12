# 研究: 引擎配置规范化与自定义引擎支持

**日期**: 2026-02-12
**状态**: 完成
**输入**: spec.md 中的 NEEDS CLARIFICATION 项 + 技术选型研究

## 1. 引擎协议检测策略

### Decision: 先 UCI 后 UCCI, 5 秒总超时

### Rationale

参考 public-Xiangqi 的 `Engine.test()` 实现, 该项目先发送 `uci`, 等待 1 秒,
检查是否收到 `uciok`; 若没有, 再发送 `ucci`, 等待 1 秒, 检查 `ucciok`.

但在飞将象棋中, 考虑到:
1. **皮卡鱼(Pikafish) 等主流 UCI 引擎**响应 `uci` 命令非常快(<100ms),
   而 UCCI 引擎收到 `uci` 命令不会报错, 只是不响应.
2. **UCCI 引擎**(如象眼)收到 `ucci` 命令后也快速响应 `ucciok`,
   但收到 `uci` 命令时不会响应 `uciok`.
3. 协议规范明确: UCI 引擎收到 `uci` 后 MUST 返回 `uciok`;
   UCCI 引擎收到 `ucci` 后 MUST 返回 `ucciok`.

因此采用**先 UCI 后 UCCI** 的策略(与 public-Xiangqi 一致):
- 启动引擎进程
- 发送 `uci\n`, 等待最长 3 秒
- 若收到含 `uciok` 的行 → 确定为 UCI 引擎
- 若超时, 发送 `ucci\n`, 等待最长 2 秒
- 若收到含 `ucciok` 的行 → 确定为 UCCI 引擎
- 均超时 → 协议识别失败, 终止进程, 报错

与现有 `ChessEngine.initEngine()` 的区别: 现有代码在构造时已知协议类型,
直接发送对应命令; 协议检测是一个独立的**探测流程**, 仅在加载新引擎时使用.

### Alternatives considered

1. **只发送 `ucci`**: 无法识别纯 UCI 引擎(如皮卡鱼), 不可行.
2. **并行发送 `uci` + `ucci`**: 可能导致引擎行为不确定, 不安全.
3. **让用户手动选择协议类型**: 增加操作复杂度, 用户体验差.

## 2. 引擎协议差异处理(UCCI vs UCI)

### Decision: 在 ChessEngine 类中统一通过 `type` 字段分支处理

### Rationale

根据官方协议规范, UCCI 和 UCI 在关键指令上的差异:

| 操作 | UCCI (xqbase.com) | UCI (Pikafish/Stockfish) |
|------|-------------------|--------------------------|
| 握手 | `ucci` → `ucciok` | `uci` → `uciok` |
| 引擎名 | `id name <名称>` | `id name <名称>` (相同) |
| 设置线程 | `setoption threads <N>` | `setoption name Threads value <N>` |
| 设置哈希 | `setoption hashsize <N>` | `setoption name Hash value <N>` |
| 就绪检查 | `isready` → `readyok` | `isready` → `readyok` (相同) |
| 设置局面 | `position fen <FEN> [moves ...]` | `position fen <FEN> [moves ...]` (相同) |
| 思考(限时) | `go ponder time <T> movestogo 1 opptime <T> oppmovestogo 1` | `go movetime <T>` |
| 新对局 | 无需(UCCI 无此概念) | `ucinewgame` |
| 退出 | `quit` → `bye` | `quit` |

现有代码已经通过 `this.type` 在 `initEngine()`, `getQueryForTime()`,
`infoAndMove()` 中做了分支处理. 新的配置系统只需要确保
`type` 字段从配置中正确传入即可.

### Alternatives considered

1. **创建 UCCIEngine / UCIEngine 子类**: 过度设计,
   差异点仅几行分支, 不值得继承层次.
2. **策略模式**: 同上, 差异点太少, 增加部分收益也配不上增加的复杂度.

## 3. 配置文件位置与格式

### Decision: `%APPDATA%/飞将象棋/engines.json`, JSON 格式

### Rationale

- 沿用 `GameRecordService` 已建立的 `app.getPath('userData')` 模式,
  保持一致性 (章程原则 V: 简洁架构).
- JSON 格式原生支持, 无需引入额外依赖 (章程: 技术栈约束).
- 配置数据量小 (通常 < 10 个引擎), JSON 读写性能不是瓶颈.
- 文件名 `engines.json` 清晰表达用途.

### Alternatives considered

1. **SQLite**: 过于重量级, 引入新依赖, 不符合 YAGNI.
2. **INI/TOML**: 需要额外解析库.
3. **Electron Store**: 需引入新依赖 `electron-store`.

## 4. 内置引擎路径解析策略

### Decision: 内置引擎使用相对于 `resourcesPath` 的路径, 自定义引擎使用绝对路径

### Rationale

- 内置引擎打包在 `assets/engine/` 中, 通过 forge 的 `extraResource`
  复制到 `process.resourcesPath`. 路径在编译期已知.
- 自定义引擎由用户指定, 路径是绝对路径, 直接存储在配置文件中.
- `engines.json` 中内置引擎可只存储相对路径后缀
  (如 `engine/ElephantEye/BIN/ELEEYE.EXE`),
  运行时拼接 `basePath`; 或直接在代码中处理, 配置中标记 `builtin: true`
  的引擎不存储路径而是使用硬编码映射.

选择: **配置中存储完整信息, 内置引擎的 `path` 为相对路径前缀**,
在 `EngineConfigService` 中负责拼接 `basePath`. 这样配置文件是自描述的,
无需代码知识即可理解.

### Alternatives considered

1. **内置引擎也存绝对路径**: 安装到不同位置时路径失效.
2. **所有引擎统一用相对路径**: 自定义引擎路径不可相对化.

## 5. EngineConfigService 的职责边界

### Decision: 新建 `EngineConfigService` 单例, 负责引擎配置 CRUD + 协议检测

### Rationale

参照 `GameRecordService` 模式 (章程原则 V: 模块单一职责):
- **EngineConfigService**: 配置文件读写、引擎增删、协议检测、路径校验.
- **ChessEngine** (已有): 保持不变, 仅负责引擎进程管理和通信.
- **feijiang.ts** (已有): 增加对 `EngineConfigService` 的引用,
  替换硬编码的 `GetUCCIEngine`.
- **menu.ts** (已有): 从 `EngineConfigService` 获取引擎列表生成菜单,
  替换 `GetAllEngineKeyNames()`.

### Alternatives considered

1. **直接改造 UCCI.ts**: 违反单一职责, UCCI.ts 已经 435 行.
2. **在 feijiang.ts 中管理配置**: feijiang.ts 是全局状态容器,
   不应承担文件 I/O 职责.

## 6. 引擎 ID 生成策略

### Decision: 内置引擎使用固定 ID (`builtin-eleeye`, `builtin-gg`, `builtin-sachess`), 自定义引擎使用 `custom-{timestamp}` 格式

### Rationale

- 内置引擎 ID 需要稳定, 跨版本不变, 用于对局历史中的引擎引用.
- 自定义引擎使用时间戳后缀避免冲突, 简单可靠, 无需引入 UUID 库.
- `crypto.randomUUID()` 在 Node.js 22+ 中可用, 但时间戳对于
  用户手动加载引擎(不可能亚毫秒级并发)的场景足够唯一.

### Alternatives considered

1. **全部使用 UUID**: 内置引擎 ID 不稳定, 升级后配置可能断裂.
2. **使用引擎名称作为 ID**: 不同引擎可能同名, 不唯一.
3. **基于文件路径 hash**: 路径变化即失效.

## 7. Cyclone 引擎删除的影响范围

### Decision: 完全删除, 不保留兼容性

### Rationale

搜索代码库, Cyclone 的引用点:
1. `src/common/constants.ts`: `ENGINE_KEY_CYCLONE`, `ENGINE_NAME_CYCLONE`
2. `src/main/UCCI.ts`: `cycloneFilePath` 变量, `GetUCCIEngine()` 分支,
   `GetAllEngineKeyNames()` 数组项
3. `test/UCCI.test.ts`: 被注释掉的 Cyclone 测试
4. `assets/engine/cyclone/`: `cyclone.exe`, `cyclone.bin`

删除后不影响任何活跃功能. 新的配置系统不再依赖这些常量.

### Alternatives considered

1. **保留常量, 仅标记 deprecated**: 增加维护负担,
   与章程原则 I (Knip 检测死代码)矛盾.

## 8. 菜单动态更新机制

### Decision: 复用现有的 `Menu.buildFromTemplate(GetTemplate())` 模式

### Rationale

现有代码在每次状态变化时重新构建菜单模板并应用:
```typescript
FeiJiang.mainWin.setMenu(Menu.buildFromTemplate(GetTemplate()));
```

引擎加载/移除时也采用同样的机制, 在 `GetTemplate()` 中从
`EngineConfigService.getEngineList()` 动态获取引擎列表.

这与 Electron 的原生菜单模型一致, 无需引入复杂的菜单更新逻辑.

### Alternatives considered

1. **IPC 通知渲染进程更新**: 菜单是原生菜单, 不在渲染进程中.
2. **使用 Menu.getApplicationMenu() 动态插入**: API 不支持动态修改子菜单项.

## 9. info 行解析架构

### Decision: 提取独立的 `parseInfoLine(line)` 纯函数, 使用关键字驱动的状态机解析

### Rationale

当前 `infoAndMove()` 中的 info 解析存在多处 bug:
1. `depth` 赋值到 `infoObj.score` 而非 `infoObj.depth`
2. `nps` 同样赋值到 `infoObj.score`
3. 解析后的 `infoObj` 从未 push 到 `pvList`
4. `for (i = 0; i < infos.length; i += 2)` 按固定步长 2 遍历,
   但 `pv` 关键字后跟的是可变长度的走法序列, 导致 pv 之后的所有字段混入错误

UCI/UCCI 的 `info` 行格式为关键字驱动 (非固定 key-value):
```
info depth 15 seldepth 20 score cp 35 nodes 1234567 nps 500000 time 2469 pv e2e4 d7d5 e4d5
```

关键字列表:
- **单值关键字**: `depth`, `seldepth`, `nodes`, `nps`, `time`, `multipv` — 后跟 1 个数值
- **复合关键字**: `score` — 后跟 `cp <N>` 或 `mate <N>` (2 个 token)
- **变长关键字**: `pv` — 后跟所有剩余 token (走法序列, 直到行末)

正确的解析策略是**关键字驱动的线性扫描**:
遍历 token 数组, 遇到已知关键字则按类型读取后续 1~N 个 token,
`pv` 的特殊处理: 一旦遇到 `pv`, 剩余所有 token 均为走法.

UCCI 与 UCI 的 info 行格式完全相同 (参照 xqbase.com UCCI 规范
第四节 "引擎输出"), 因此 `parseInfoLine()` 不需要区分协议类型.

### Alternatives considered

1. **正则表达式匹配**: `info` 行字段顺序不固定, 正则难以覆盖所有排列.
2. **继续在 infoAndMove 中内联修复**: 违反单一职责, 不便于独立测试.
3. **使用第三方 UCI 解析库**: 引入新依赖, 与章程原则 V (YAGNI) 矛盾.

## 10. 实时 info 流式推送机制

### Decision: 在 `infoAndMove()` 和 `analyzePosition()` 中通过可选 `onInfo` 回调实现流式推送

### Rationale

当前引擎通信模型: `send()` → 一个 `UCCICallback` → 等待 `bestmove` 再触发.
`info` 行在 `bestmove` 前被 buffer, 全部积累到最终结果.

对于局面分析场景, 需要**实时**推送每一行 info 给调用方. 两种方案:

1. **EventEmitter 模式**: `ChessEngine extends EventEmitter`, 发出 `'info'` 事件.
   需要重构 ChessEngine 继承链, 改动范围大.
2. **回调参数模式**: `infoAndMove(fen, opts, onInfo?)` 增加可选回调.
   在 stdout `data` 处理中, 检测到 `info` 行时即调用 `onInfo(parsedInfo)`.
   不改变现有接口签名, 仅扩展参数, 向后兼容.

选择方案 2: **回调参数模式**, 理由:
- 最小改动量, 不影响现有 `infoAndMove()` 调用方 (ipc.ts)
- `onInfo` 为可选参数, 不传则行为与现在完全一致
- 与现有 callback-based 架构风格一致
- 若未来需要 EventEmitter, 可在不破坏接口的情况下内部升级

### Alternatives considered

1. **EventEmitter**: 改动范围大, 需要重构所有 `send/callback` 流程.
2. **RxJS Observable**: 引入重依赖, 过度设计.

## 11. 分析模式 (`go infinite`) 接口设计

### Decision: 新增 `analyzePosition(fen, onInfo)` 和 `stopAnalysis()` 方法, 底层复用 `send/sendAsync` 机制

### Rationale

分析模式 (局面评估) 的协议流程:
```
position fen <FEN>
go infinite
→ 引擎持续输出 info 行 (depth 递增)
stop
→ 引擎返回 bestmove
```

与走棋查询的区别:
- `go infinite` 没有时间限制, 引擎会持续搜索直到收到 `stop`
- 需要在搜索过程中实时推送 info (通过 `onInfo` 回调)
- `stop` 后引擎仍会返回最终的 `bestmove`, 但分析模式通常不使用 bestmove

接口设计:
```typescript
analyzePosition(fen: string, onInfo: (info: Info) => void): Promise<void>
stopAnalysis(): Promise<InfoAndMove>
```

`analyzePosition` 内部流程:
1. 发送 `position fen <FEN>` (UCI 格式为 `fen <FEN>`)
2. 将 `onInfo` 存为实例字段
3. 发送 `go infinite`, 不等待 bestmove
4. 在 stdout handler 中, `info` 行触发 `onInfo` 回调

`stopAnalysis` 内部流程:
1. 发送 `stop`
2. 等待 `bestmove` 响应
3. 清除 `onInfo` 回调
4. 返回最终的 InfoAndMove

这两个方法**在当前迭代中不被任何 UI 调用**, 仅作为接口预留,
在 `test/UCCI.test.ts` 中编写集成测试验证正确性.

### Alternatives considered

1. **单一方法 `analyze(fen, opts)`**: 无法表达 start/stop 的生命周期.
2. **创建 `AnalysisEngine` 子类**: 过度设计, 分析是 ChessEngine 的能力之一.
