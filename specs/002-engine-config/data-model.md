# 数据模型: 引擎配置规范化与自定义引擎支持

**日期**: 2026-02-12
**输入**: spec.md + research.md

## 实体

### EngineConfig

单个引擎的配置信息.

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | `string` | ✅ | 唯一标识. 内置: `builtin-eleeye` / `builtin-gg` / `builtin-sachess`; 自定义: `custom-{timestamp}` |
| `name` | `string` | ✅ | 显示名称, 从引擎 `id name` 响应提取或用户自定义 |
| `path` | `string` | ✅ | EXE 文件路径. 内置: 相对路径 (如 `engine/ElephantEye/BIN/ELEEYE.EXE`); 自定义: 绝对路径 |
| `protocol` | `'ucci' \| 'uci'` | ✅ | 引擎通信协议类型 |
| `builtin` | `boolean` | ✅ | 是否为内置引擎. `true` = 不可移除, 路径相对于 `basePath` 解析 |
| `thread` | `number` | ❌ | 线程数, 默认使用 `os.cpus().length` |
| `hashSize` | `number` | ❌ | 哈希表大小 (MB), 默认 `128` |

**验证规则**:
- `id`: 非空, 在配置文件中唯一
- `name`: 非空, 长度 ≤ 100
- `path`: 非空; 内置引擎不校验 (已知存在); 自定义引擎在启动时校验 `fs.existsSync()`
- `protocol`: 仅允许 `'ucci'` 或 `'uci'`
- `builtin`: 仅在默认配置生成时为 `true`
- `thread`: 正整数, 范围 `[1, 1024]`
- `hashSize`: 正整数, 范围 `[1, 65536]`

**状态**: 无状态转换. EngineConfig 是静态配置数据.

---

### EngineConfigFile

配置文件整体结构, 对应 `engines.json` 的序列化格式.

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `version` | `string` | ✅ | 配置文件版本号, 初始值 `'1.0'`. 用于未来格式迁移 |
| `engines` | `EngineConfig[]` | ✅ | 引擎配置数组 |
| `defaultEngineId` | `string` | ✅ | 默认引擎 ID, 初始值 `'builtin-eleeye'` |

**验证规则**:
- `version`: 非空, 语义化版本格式
- `engines`: 非空数组, 至少包含一个内置引擎
- `defaultEngineId`: 必须引用 `engines` 数组中存在的 `id`

---

### EngineProbeResult

引擎协议检测的返回结果 (仅运行时使用, 不持久化).

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `success` | `boolean` | ✅ | 检测是否成功 |
| `protocol` | `'ucci' \| 'uci' \| null` | ✅ | 检测到的协议类型, 失败时为 `null` |
| `name` | `string` | ❌ | 从 `id name` 提取的引擎名称 |
| `options` | `EngineOption[]` | ❌ | 引擎报告的可配置选项 |
| `error` | `string` | ❌ | 失败时的错误信息 |

---

### EngineOption

引擎报告的选项信息 (用于未来引擎高级设置, 当前仅记录).

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `name` | `string` | ✅ | 选项名称 (如 `Threads`, `Hash`) |
| `type` | `'check' \| 'spin' \| 'combo' \| 'button' \| 'string'` | ✅ | 选项类型 |
| `default` | `string` | ❌ | 默认值 |
| `min` | `number` | ❌ | 最小值 (仅 spin 类型) |
| `max` | `number` | ❌ | 最大值 (仅 spin 类型) |

---

### Info (重构)

引擎搜索过程中每行 `info` 输出解析后的结构化数据.
替代现有的简化版 `Info` 接口 (原版仅有 depth/score/pv, 且存在赋值 bug).

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `depth` | `number` | ✅ | 搜索深度 |
| `seldepth` | `number` | ❌ | 选择性搜索深度 (selective depth) |
| `score` | `number` | ✅ | 评分值 (centipawn 或 mate 步数) |
| `scoreType` | `'cp' \| 'mate'` | ✅ | 评分类型: `cp` = centipawn, `mate` = 将杀步数 |
| `nodes` | `number` | ❌ | 已搜索节点数 |
| `nps` | `number` | ❌ | 每秒搜索节点数 |
| `time` | `number` | ❌ | 搜索用时 (毫秒) |
| `multipv` | `number` | ❌ | 多路 PV 编号 (默认 1) |
| `pv` | `string[]` | ✅ | 主变例走法序列 (ICCS 格式, 如 `['e2e4', 'd7d5']`) |

**验证规则**:
- `depth`: 正整数, 范围 `[1, 256]`
- `score`: 整数, 无范围限制
- `scoreType`: 仅允许 `'cp'` 或 `'mate'`
- `pv`: 非空数组, 每个元素为 4 字符的 ICCS 走法标记

**注**: 此实体仅在运行时使用, 不持久化. UCCI 和 UCI 的 info 行格式相同,
`parseInfoLine()` 不需要区分协议类型.

---

### InfoAndMove (重构)

一次完整的引擎走棋查询返回结果, 包含所有 info 行和最终 bestmove.

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `pvList` | `Info[]` | ✅ | 搜索过程中所有 info 行的解析结果, 按 depth 递增 |
| `bestmove` | `string` | ✅ | 引擎推荐的最佳走法 (ICCS 格式) |
| `ponder` | `string` | ❌ | 引擎推荐对手应走 (ICCS 格式) |
| `nodes` | `number` | ❌ | 总搜索节点数 (从最后一行 info 提取) |
| `nps` | `number` | ❌ | 最终 nps |
| `time` | `number` | ❌ | 总搜索用时 |

---

## 实体关系

```
EngineConfigFile 1 ──── * EngineConfig
       │
       └── defaultEngineId ──→ EngineConfig.id

EngineConfigService (runtime)
       │
       ├── loads/saves ──→ EngineConfigFile (engines.json)
       ├── probes ──→ EngineProbeResult (transient)
       └── provides ──→ ChessEngine (existing, via feijiang.ts)
                              │
                              ├── infoAndMove() ──→ InfoAndMove (contains Info[])
                              ├── analyzePosition() ──→ streams Info via onInfo callback
                              └── parseInfoLine() ──→ Info (pure function, exported)
```

## 默认配置 (首次启动生成)

```json
{
  "version": "1.0",
  "defaultEngineId": "builtin-eleeye",
  "engines": [
    {
      "id": "builtin-eleeye",
      "name": "象眼",
      "path": "engine/ElephantEye/BIN/ELEEYE.EXE",
      "protocol": "ucci",
      "builtin": true
    },
    {
      "id": "builtin-gg",
      "name": "佳佳",
      "path": "engine/gg20180531/NewGG.exe",
      "protocol": "uci",
      "builtin": true
    },
    {
      "id": "builtin-sachess",
      "name": "南奥",
      "path": "engine/sachess1.6/sachess_x86.exe",
      "protocol": "uci",
      "builtin": true
    }
  ]
}
```
