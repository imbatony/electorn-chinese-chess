# 质量检查清单: 引擎配置规范化与自定义引擎支持

**目的**: 验证全部 6 个用户故事 (US1-US6)、15 项功能需求 (FR-001~015)、7 项成功标准 (SC-001~007) 和章程合规性
**创建时间**: 2026-02-12
**功能**: [spec.md](spec.md) | [plan.md](plan.md) | [tasks.md](tasks.md)

---

## 一、功能需求验证 (FR-001 ~ FR-015)

### US1: 删除 Cyclone 引擎

- [ ] CHK001 [FR-001] `src/common/constants.ts` 中无 `ENGINE_KEY_CYCLONE` 和 `ENGINE_NAME_CYCLONE`
- [ ] CHK002 [FR-001] `src/main/UCCI.ts` 中无 Cyclone 相关 case 分支和文件路径
- [ ] CHK003 [FR-001] `test/UCCI.test.ts` 中无 Cyclone 相关测试用例
- [ ] CHK004 [FR-001] `assets/engine/cyclone/` 目录已删除
- [ ] CHK005 [FR-001] `forge.config.js` 的 `extraResource` 不引用 cyclone
- [ ] CHK006 [SC-001] `grep -r "cyclone\|CYCLONE" --include="*.ts" src/ test/` 返回零结果

### US2: 引擎配置数据持久化

- [ ] CHK007 [FR-002] `engines.json` 存储在 `%APPDATA%/飞将象棋/` 目录
- [ ] CHK008 [FR-003] 首次启动 (无 `engines.json`) 自动生成包含 3 个内置引擎 (象眼/佳佳/南奥) 的默认配置
- [ ] CHK009 [FR-003] 默认配置 `version` 为 `'1.0'`, `defaultEngineId` 为 `'builtin-eleeye'`
- [ ] CHK010 [FR-002] 已有合法 `engines.json` 时正确加载, 菜单显示所有引擎
- [ ] CHK011 [FR-010] `engines.json` 损坏 (JSON 解析失败) → 备份为 `.bak` → 重新生成默认配置 → 控制台警告日志
- [ ] CHK012 [FR-002] `EngineConfigService` 采用单例模式 (`private constructor` + `static getInstance()`)
- [ ] CHK013 [FR-002] `EngineConfigService.init()` 在 `app.on('ready')`, `createWindow()` 之前调用

### US3: 加载自定义引擎

- [ ] CHK014 [FR-004] 菜单 "引擎设置 → 加载引擎" 存在且可点击
- [ ] CHK015 [FR-004] 点击后弹出文件选择对话框, 过滤器为 `*.exe`
- [ ] CHK016 [FR-005] 先发送 `uci` (3s 超时), 等待 `uciok`; 失败后发送 `ucci` (2s 超时), 等待 `ucciok`
- [ ] CHK017 [FR-005] 总超时 5 秒, 超时后 kill 进程并显示错误通知
- [ ] CHK018 [FR-006] 从引擎响应中提取 `id name` 行作为引擎显示名称
- [ ] CHK019 [FR-007] 加载成功后, 引擎立即出现在 "游戏设置 → 红方/黑方" 子菜单中, 无需重启
- [ ] CHK020 [FR-007] 菜单通过 `Menu.buildFromTemplate()` + `Menu.setApplicationMenu()` 重建实现动态刷新
- [ ] CHK021 重复加载同一路径的引擎 → 显示 "该引擎已存在" 通知, 不重复添加
- [ ] CHK022 选择非引擎 EXE → 显示 "无法识别引擎协议" 通知, 不修改配置文件
- [ ] CHK023 加载的引擎在应用重启后仍存在于菜单中
- [ ] CHK024 自定义引擎 ID 格式为 `custom-{timestamp}`

### US4: 移除自定义引擎

- [ ] CHK025 [FR-008] 菜单 "引擎设置 → 管理引擎" 存在, 列出所有自定义引擎且每项带 "❌ 移除"
- [ ] CHK026 [FR-008] 内置引擎 (`builtin: true`) 不出现在管理引擎列表中
- [ ] CHK027 [FR-008] 移除成功后, 菜单立即更新, `engines.json` 同步删除该条目
- [ ] CHK028 移除正在使用的引擎 → 显示 "该引擎正在使用中, 请先切换到其他引擎" 通知, 不执行移除
- [ ] CHK029 移除引擎后重启应用, 菜单中不再显示该引擎

### US5: 引擎路径失效处理

- [ ] CHK030 [FR-009] 启动时校验自定义引擎 EXE 文件是否存在 (`fs.existsSync`)
- [ ] CHK031 [FR-009] 路径失效的引擎在菜单中显示为灰色 (禁用), 附加 "(不可用)" 标记
- [ ] CHK032 点击不可用引擎 → 显示 "引擎文件不存在, 请重新加载或移除该引擎" 通知
- [ ] CHK033 内置引擎始终标记为可用 (不做路径校验)

### US6: 引擎集成代码优化

- [ ] CHK034 [FR-015] `parseInfoLine()` 作为独立纯函数从 `src/main/UCCI.ts` 模块级导出
- [ ] CHK035 [FR-011] 正确解析 `depth`, `seldepth`, `score cp`, `score mate`, `nodes`, `nps`, `time`, `multipv`, `pv`
- [ ] CHK036 [FR-011] UCCI 兼容: `score` 后既非 `cp` 也非 `mate` 时, 直接视为 centipawn (`scoreType: 'cp'`)
- [ ] CHK037 [FR-011] `pv` 关键字后的所有 token 均为走法, 支持变长 (1 步、3 步、10 步等)
- [ ] CHK038 [FR-012] 每个解析成功的 `Info` 对象被 push 到 `InfoAndMove.pvList`
- [ ] CHK039 [FR-012] `InfoAndMove.nodes/nps/time` 从最后一条 Info 提取
- [ ] CHK040 [FR-012] `bestmove` 行被正确解析, 提取 `ponder` 字段 (如有)
- [ ] CHK041 [FR-013] `infoAndMove(fen, option, onInfo?)` 支持可选 `onInfo` 回调参数
- [ ] CHK042 [FR-013] 每解析一行 `info`, 若 `onInfo` 存在则实时调用, 不等 `bestmove`
- [ ] CHK043 [FR-013] 不传 `onInfo` 时, 行为与修复前完全兼容 (现有调用方不受影响)
- [ ] CHK044 [FR-014] `analyzePosition(fen, onInfo)` 发送 `position fen` + `go infinite`
- [ ] CHK045 [FR-014] `stopAnalysis()` 发送 `stop`, 等待 `bestmove`, 返回 `InfoAndMove`
- [ ] CHK046 [FR-014] 分析模式期间持续通过 `onInfo` 回调推送 info 数据

---

## 二、类型与数据模型验证

- [ ] CHK047 `src/main/engine-types.ts` 包含 `EngineConfig` 接口, 字段: `id`, `name`, `path`, `protocol`, `builtin`, `thread?`, `hashSize?`
- [ ] CHK048 `EngineConfig.protocol` 类型为 `'ucci' | 'uci'` (非 `string`)
- [ ] CHK049 `EngineConfigFile` 接口包含 `version: string`, `engines: EngineConfig[]`, `defaultEngineId: string`
- [ ] CHK050 `EngineProbeResult` 接口包含 `success: boolean`, `protocol: 'ucci' | 'uci' | null`, `name?: string`, `error?: string`
- [ ] CHK051 `Info` 接口包含 `depth: number`, `score: number`, `scoreType: 'cp' | 'mate'`, `pv: string[]` (必填) 及 `seldepth?`, `nodes?`, `nps?`, `time?`, `multipv?` (可选)
- [ ] CHK052 `InfoAndMove` 接口包含 `pvList: Info[]`, `bestmove: string`, `ponder?: string`, `nodes?`, `nps?`, `time?`
- [ ] CHK053 `OnInfoCallback` 类型为 `(info: Info) => void`
- [ ] CHK054 所有类型无 `any`, 编译通过 `noImplicitAny` 严格模式

---

## 三、测试覆盖验证

- [ ] CHK055 [SC-006] `parseInfoLine()` 单元测试覆盖率 100%
  - [ ] 标准 UCI info 行 (含 depth/seldepth/score cp/nodes/nps/time/pv)
  - [ ] UCCI info 行 (score 无 cp/mate 前缀)
  - [ ] `score mate N` → `scoreType: 'mate'`
  - [ ] `score cp -150` → 负数评分
  - [ ] `multipv 2` → 多路 PV
  - [ ] 变长 pv: 1 步、3 步、10 步
  - [ ] 无 pv 的 info 行 → 返回 `null`
  - [ ] 非 info 行 → 返回 `null`
- [ ] CHK056 [SC-007] `onInfo` 回调测试: 模拟多行 info + bestmove
  - [ ] `pvList.length` 等于 info 行数
  - [ ] `onInfo` 被调用次数 = info 行数
  - [ ] 每次回调参数为有效 `Info` 对象
- [ ] CHK057 `EngineConfigService` 单元测试
  - [ ] `init()` 首次启动: 生成默认配置
  - [ ] `init()` 合法配置: 正确加载
  - [ ] `init()` 损坏配置: 备份 + 重建
  - [ ] `getAllEngines()` 返回数组副本
  - [ ] `getEngineById()` 存在 / 不存在
  - [ ] `resolveEnginePath()` 内置拼接 basePath / 自定义返回绝对路径
  - [ ] `isEngineAvailable()` 内置始终 true / 自定义校验 existsSync
- [ ] CHK058 `probeEngine()` 单元测试
  - [ ] UCI 引擎识别
  - [ ] UCCI 引擎识别
  - [ ] 非引擎超时
- [ ] CHK059 `addCustomEngine()` 单元测试
  - [ ] 正常添加
  - [ ] 路径重复异常
- [ ] CHK060 `removeCustomEngine()` 内置引擎不可移除
- [ ] CHK061 新增代码测试覆盖率 ≥ 70% (章程原则 II)
- [ ] CHK062 `npm test` 全部通过, 无失败用例

---

## 四、章程合规检查

### 原则 I: 代码质量优先

- [ ] CHK063 所有新增代码使用 TypeScript, 无 `any` 类型
- [ ] CHK064 `npm run lint` 零错误零警告
- [ ] CHK065 `npm run format:check` 通过
- [ ] CHK066 `npx knip` 无未使用的导出、依赖或文件
- [ ] CHK067 所有新增文件行数 ≤ 300 行; 若超出则有内聚性说明
- [ ] CHK068 命名规范: 类 PascalCase, 方法/变量 camelCase, 常量 UPPER_SNAKE_CASE

### 原则 II: 测试纪律

- [ ] CHK069 `EngineConfigService` 有完整单元测试 (T006)
- [ ] CHK070 `parseInfoLine()` 有 100% 覆盖率单元测试 (T024)
- [ ] CHK071 `infoAndMove()` 重构后有集成测试 (T025)
- [ ] CHK072 引擎通信修改在真实引擎环境下手动验证

### 原则 III: UX 一致性

- [ ] CHK073 所有新增菜单项使用中文文本
- [ ] CHK074 通知措辞一致:
  - "无法识别引擎协议, 请确认文件为合法的 UCCI/UCI 引擎"
  - "该引擎已存在"
  - "该引擎正在使用中, 请先切换到其他引擎"
  - "引擎文件不存在, 请重新加载或移除该引擎"
- [ ] CHK075 不可用引擎使用灰色禁用状态 + "(不可用)" 标记

### 原则 IV: 性能标准

- [ ] CHK076 [SC-005] 引擎配置操作 (加载/移除/持久化) 不阻塞渲染进程
- [ ] CHK077 `probeEngine()` 为 async, 不阻塞主进程事件循环
- [ ] CHK078 `engines.json` 读写在主进程中执行, 渲染进程无直接文件 I/O
- [ ] CHK079 [SC-003] 自定义引擎通信响应时间与内置引擎无显著差异 (±10%)
- [ ] CHK080 `onInfo` 回调在 stdout handler 中同步调用, 不引入额外延迟

### 原则 V: 简洁架构

- [ ] CHK081 `EngineConfigService` 在 `src/main/` 中, 不在 `common/` 或 `renderer/`
- [ ] CHK082 `engine-types.ts` 不依赖 Electron API
- [ ] CHK083 `parseInfoLine()` 为纯函数, 无副作用、无 Electron 依赖
- [ ] CHK084 无新增第三方依赖 (`package.json` 无新增 dependencies)
- [ ] CHK085 IPC 事件名通过 `IPCInfos.ts` 常量定义 (如有新增)
- [ ] CHK086 `feijiang.ts` 中引擎键从硬编码常量变为 `EngineConfig.id`

---

## 五、边界情况与健壮性

- [ ] CHK087 引擎 EXE 路径包含中文时, `spawn` 正常启动进程
- [ ] CHK088 引擎 EXE 路径包含空格时, `spawn` 正常启动进程
- [ ] CHK089 引擎进程启动后挂起 → 5 秒超时后自动终止并报错
- [ ] CHK090 红方和黑方使用不同引擎时, 两个引擎进程独立运行互不干扰
- [ ] CHK091 `engines.json` 被外部程序修改为不完整格式 → 跳过无效条目, 日志记录警告
- [ ] CHK092 [SC-002] 从点击 "加载引擎" 到引擎可用于对局 ≤ 30 秒
- [ ] CHK093 [SC-004] 配置损坏恢复后, 内置引擎功能完全正常, 无需用户干预

---

## 六、构建与发布验证

- [ ] CHK094 `npm run make:prod` 构建成功, 无编译错误
- [ ] CHK095 构建产物中 `assets/engine/` 不含 `cyclone/` 目录
- [ ] CHK096 构建产物中 `assets/engine/` 包含 ElephantEye, gg20180531, sachess1.6
- [ ] CHK097 安装后首次启动, 自动生成 `engines.json` 并正确显示 3 个内置引擎
- [ ] CHK098 提交信息遵循约定式提交格式: `type(scope): description`

---

## 七、quickstart 端到端验证

- [ ] CHK099 场景 1: 首次启动 → 默认配置生成 → 3 个内置引擎可用
- [ ] CHK100 场景 2: 选择象眼 (UCCI) 和佳佳 (UCI) → 正常人机对局
- [ ] CHK101 场景 3: 加载外部 UCI 引擎 (如 Pikafish) → 菜单立即显示 → 对局正常
- [ ] CHK102 场景 4: 加载外部 UCCI 引擎 → 协议正确识别 → 对局正常
- [ ] CHK103 场景 5: 移除自定义引擎 → 菜单更新 → 重启后仍不显示
- [ ] CHK104 场景 6: 删除自定义引擎 EXE → 重启 → 引擎灰色不可用
- [ ] CHK105 场景 7: 损坏 engines.json → 重启 → 自动恢复, 内置引擎正常
- [ ] CHK106 info 解析验证: 使用 UCI 引擎走棋 → pvList 包含正确 depth/score/pv 数据

---

## 备注

- 完成项目时勾选: `[x]`
- CHK001-CHK006 对应 US1 验收场景 1-3
- CHK007-CHK013 对应 US2 验收场景 1-3
- CHK014-CHK024 对应 US3 验收场景 1-4
- CHK025-CHK029 对应 US4 验收场景 1-3
- CHK030-CHK033 对应 US5 验收场景 1-2
- CHK034-CHK046 对应 US6 验收场景 1-4
- CHK063-CHK086 映射到章程 v1.0.0 五大原则
- CHK099-CHK106 映射到 quickstart.md 手动验证场景
