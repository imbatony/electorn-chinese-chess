# EngineConfigService 内部 API 契约

**日期**: 2026-02-12
**类型**: Electron 主进程内部 TypeScript API (非 HTTP)
**输入**: data-model.md

> 本项目是 Electron 桌面应用, 不存在 REST API.
> 以下契约描述 `EngineConfigService` 的公开方法签名, 供 `menu.ts`、
> `feijiang.ts`、`ipc.ts` 等主进程模块调用.

## EngineConfigService (单例)

```typescript
// 文件: src/main/EngineConfigService.ts

import { EngineConfig, EngineConfigFile, EngineProbeResult } from './engine-types';

export class EngineConfigService {
  private static instance: EngineConfigService;

  /** 获取单例实例 */
  static getInstance(): EngineConfigService;

  // ========================================================================
  // 生命周期
  // ========================================================================

  /**
   * 初始化服务, 加载或生成配置文件.
   * 在 app 'ready' 事件后调用, 在 createWindow() 之前.
   *
   * 行为:
   * - 若 engines.json 存在且合法 → 加载
   * - 若 engines.json 不存在 → 生成默认配置并写入
   * - 若 engines.json 损坏 → 备份为 .bak, 重新生成默认配置
   * - 自定义引擎的路径校验 (fs.existsSync)
   */
  init(): void;

  // ========================================================================
  // 查询
  // ========================================================================

  /**
   * 获取所有引擎配置列表 (包括内置和自定义).
   * 返回的数组是副本, 修改不影响内部状态.
   */
  getAllEngines(): EngineConfig[];

  /**
   * 根据 ID 获取单个引擎配置.
   * @returns 引擎配置或 undefined
   */
  getEngineById(id: string): EngineConfig | undefined;

  /**
   * 获取默认引擎 ID.
   */
  getDefaultEngineId(): string;

  /**
   * 获取引擎的完整 EXE 路径.
   * 内置引擎: basePath + config.path
   * 自定义引擎: config.path (已是绝对路径)
   */
  resolveEnginePath(config: EngineConfig): string;

  /**
   * 检查引擎 EXE 文件是否存在.
   */
  isEngineAvailable(config: EngineConfig): boolean;

  // ========================================================================
  // 引擎加载 (自定义引擎)
  // ========================================================================

  /**
   * 探测指定 EXE 文件的引擎协议类型.
   * 启动子进程 → 先发送 uci → 再发送 ucci → 提取 id name.
   * 总超时 5 秒.
   *
   * @param exePath 引擎 EXE 的绝对路径
   * @returns 探测结果
   */
  probeEngine(exePath: string): Promise<EngineProbeResult>;

  /**
   * 添加自定义引擎到配置.
   *
   * 前置条件: probeEngine() 成功
   * 后置条件: 写入 engines.json, 返回新配置
   *
   * @param exePath EXE 绝对路径
   * @param probeResult 探测结果
   * @returns 新创建的 EngineConfig
   * @throws 若路径已存在于配置中
   */
  addCustomEngine(exePath: string, probeResult: EngineProbeResult): EngineConfig;

  // ========================================================================
  // 引擎移除 (自定义引擎)
  // ========================================================================

  /**
   * 移除自定义引擎.
   *
   * @param id 引擎 ID
   * @returns true=成功, false=未找到或为内置引擎
   * @throws 若引擎正在被使用 (由调用方检查)
   */
  removeCustomEngine(id: string): boolean;

  // ========================================================================
  // 持久化 (私有, 自动触发)
  // ========================================================================

  /** 将当前配置写入 engines.json (内部方法, add/remove 自动调用) */
  private save(): void;
}
```

## 类型定义

```typescript
// 文件: src/main/engine-types.ts (或合并到 src/common/constants.ts)

export interface EngineConfig {
  id: string;
  name: string;
  path: string;
  protocol: 'ucci' | 'uci';
  builtin: boolean;
  thread?: number;
  hashSize?: number;
}

export interface EngineConfigFile {
  version: string;
  engines: EngineConfig[];
  defaultEngineId: string;
}

export interface EngineProbeResult {
  success: boolean;
  protocol: 'ucci' | 'uci' | null;
  name?: string;
  options?: EngineOption[];
  error?: string;
}

export interface EngineOption {
  name: string;
  type: 'check' | 'spin' | 'combo' | 'button' | 'string';
  default?: string;
  min?: number;
  max?: number;
}

// ========================================================================
// 引擎搜索信息 (重构, 替代原有简化版 Info)
// ========================================================================

export interface Info {
  depth: number;
  seldepth?: number;
  score: number;
  scoreType: 'cp' | 'mate';
  nodes?: number;
  nps?: number;
  time?: number;
  multipv?: number;
  pv: string[];
}

export interface InfoAndMove {
  pvList: Info[];
  bestmove: string;
  ponder?: string;
  nodes?: number;
  nps?: number;
  time?: number;
}

/** info 行解析纯函数, 从 UCCI.ts 中导出, 便于独立测试和复用 */
export function parseInfoLine(line: string): Info | null;

/** onInfo 回调类型, 用于实时推送引擎搜索信息 */
export type OnInfoCallback = (info: Info) => void;
```

## 调用方集成点

### menu.ts 修改

```typescript
// 替换 GetAllEngineKeyNames() 调用
import { EngineConfigService } from './EngineConfigService';

// 在 GetTemplate() 中:
const engineService = EngineConfigService.getInstance();
const engines = engineService.getAllEngines();

// 红方/黑方子菜单: 遍历 engines, 用 config.id 作为 key, config.name 作为 label
// 不可用引擎: label 追加 '(不可用)', enabled: false

// 引擎设置菜单:
// - 加载引擎: 打开文件对话框 → probeEngine → addCustomEngine → 刷新菜单
// - 管理引擎: 子菜单列出 builtin=false 的引擎, 每项附带移除操作
```

### feijiang.ts 修改

```typescript
// 替换 GetUCCIEngine() 调用
import { EngineConfigService } from './EngineConfigService';

// getEngineByKey 改为从 EngineConfigService 获取配置, 构造 ChessEngine
async function getEngineByKey(key: string): Promise<ChessEngine> {
  let engine = engines.get(key);
  if (!engine) {
    const configService = EngineConfigService.getInstance();
    const config = configService.getEngineById(key);
    if (!config) throw new Error(`Engine not found: ${key}`);
    const fullPath = configService.resolveEnginePath(config);
    engine = new ChessEngine(
      fullPath,
      config.name,
      config.protocol,
      FeiJiangInstance.engineThreadCount,
      config.hashSize
    );
    await engine.initEngine();
    engines.set(key, engine);
  }
  return engine;
}
```

### index.ts 修改

```typescript
// 在 app.on('ready', ...) 中, createWindow() 之前:
import { EngineConfigService } from './EngineConfigService';
EngineConfigService.getInstance().init();
```

## ChessEngine 扩展 API (引擎代码优化)

> 以下为 `src/main/UCCI.ts` 中 `ChessEngine` 类的新增/重构方法签名.
> 目标: 修复现有 bug, 为后续局面分析功能预留接口.

```typescript
// 文件: src/main/UCCI.ts

import { Info, InfoAndMove, OnInfoCallback } from './engine-types';

/**
 * info 行解析纯函数 (从 ChessEngine 中提取, 模块级导出).
 * 使用关键字驱动的线性扫描, 支持所有 UCI/UCCI info 字段.
 *
 * @param line 原始 info 行 (含 'info' 前缀)
 * @returns 解析后的 Info 对象, 无法解析则返回 null
 */
export function parseInfoLine(line: string): Info | null;

export class ChessEngine {
  // ... 现有属性和方法保持不变 ...

  /**
   * 查询走棋 (重构版).
   * 主要变更:
   * 1. 修复 info 解析 bug (使用 parseInfoLine)
   * 2. 将解析后的 Info push 到 pvList
   * 3. 支持可选的 onInfo 回调, 实时推送每行 info
   *
   * @param fen 当前局面 FEN 字符串
   * @param option 查询选项 (difficulty, maxTime)
   * @param onInfo 可选的实时 info 回调, 每解析完一行 info 即调用
   */
  public async infoAndMove(
    fen: string,
    option: QueryMoveOption,
    onInfo?: OnInfoCallback
  ): Promise<InfoAndMove | null>;

  /**
   * 启动无限分析模式 (为后续局面分析功能预留).
   * 发送 position + go infinite, 通过 onInfo 回调实时推送分析数据.
   * 调用 stopAnalysis() 结束分析.
   *
   * @param fen 要分析的局面 FEN 字符串
   * @param onInfo 实时 info 回调 (必填, 分析模式必须有数据消费者)
   */
  public async analyzePosition(
    fen: string,
    onInfo: OnInfoCallback
  ): Promise<void>;

  /**
   * 停止当前分析, 发送 stop 命令.
   * 引擎会返回最终的 bestmove.
   *
   * @returns 分析期间累积的最终 InfoAndMove
   */
  public async stopAnalysis(): Promise<InfoAndMove>;
}
```

### 现有调用方影响

```typescript
// ipc.ts - 无需修改
// infoAndMove() 的第三个参数 onInfo 是可选的,
// 现有调用 `engine.infoAndMove(fenStr, { difficulty, maxTime })`
// 不传 onInfo, 行为与修复后完全一致, 仅 pvList 数据更准确.
```