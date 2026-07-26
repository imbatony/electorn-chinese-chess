/**
 * 引擎配置与搜索信息类型定义
 *
 * 包含引擎配置管理 (US2) 和搜索信息解析 (US6) 的所有类型。
 * 参考: data-model.md, contracts/engine-config-service-api.md
 */

// ========================================================================
// 引擎配置相关类型 (US2)
// ========================================================================

/** 单个引擎的配置信息 */
export interface EngineConfig {
  /** 唯一标识。内置: builtin-eleeye / builtin-gg / builtin-sachess; 自定义: custom-{timestamp} */
  id: string;
  /** 显示名称, 从引擎 `id name` 响应提取或用户自定义 */
  name: string;
  /** EXE 文件路径。内置: 相对路径; 自定义: 绝对路径 */
  path: string;
  /** 引擎通信协议类型 */
  protocol: 'ucci' | 'uci';
  /** 是否为内置引擎。true = 不可移除, 路径相对于 basePath 解析 */
  builtin: boolean;
  /** 线程数, 默认使用 os.cpus().length */
  thread?: number;
  /** 哈希表大小 (MB), 默认 128 */
  hashSize?: number;
  /** @deprecated 不再使用，保留用于兼容旧配置文件 */
  useCliArgs?: boolean;
}

/** 配置文件整体结构, 对应 engines.json 的序列化格式 */
export interface EngineConfigFile {
  /** 配置文件版本号, 初始值 '1.0' */
  version: string;
  /** 引擎配置数组 */
  engines: EngineConfig[];
  /** 默认引擎 ID, 初始值 'builtin-eleeye' */
  defaultEngineId: string;
}

/** 引擎协议检测的返回结果 (仅运行时使用, 不持久化) */
export interface EngineProbeResult {
  /** 检测是否成功 */
  success: boolean;
  /** 检测到的协议类型, 失败时为 null */
  protocol: 'ucci' | 'uci' | null;
  /** 从 id name 提取的引擎名称 */
  name?: string;
  /** 引擎报告的可配置选项 */
  options?: EngineOption[];
  /** 失败时的错误信息 */
  error?: string;
}

/** 引擎报告的选项信息 (用于未来引擎高级设置, 当前仅记录) */
export interface EngineOption {
  /** 选项名称 (如 Threads, Hash) */
  name: string;
  /** 选项类型 */
  type: 'check' | 'spin' | 'combo' | 'button' | 'string';
  /** 默认值 */
  default?: string;
  /** 最小值 (仅 spin 类型) */
  min?: number;
  /** 最大值 (仅 spin 类型) */
  max?: number;
  /** 可选值 (仅 combo 类型) */
  values?: string[];
}

// ========================================================================
// 引擎搜索信息类型 (US6, 重构)
// ========================================================================

/**
 * 引擎搜索过程中每行 info 输出解析后的结构化数据。
 * 替代现有的简化版 Info 接口。
 * UCI/UCCI 的 info 行格式相同, parseInfoLine() 不需要区分协议类型。
 */
export interface Info {
  /** 搜索深度 */
  depth: number;
  /** 选择性搜索深度 (selective depth) */
  seldepth?: number;
  /** 评分值 (centipawn 或 mate 步数) */
  score: number;
  /** 评分类型: cp = centipawn, mate = 将杀步数 */
  scoreType: 'cp' | 'mate';
  /** 已搜索节点数 */
  nodes?: number;
  /** 每秒搜索节点数 */
  nps?: number;
  /** 搜索用时 (毫秒) */
  time?: number;
  /** 多路 PV 编号 (默认 1) */
  multipv?: number;
  /** 主变例走法序列 (ICCS 格式, 如 ['e2e4', 'd7d5']) */
  pv: string[];
}

/**
 * 一次完整的引擎走棋查询返回结果,
 * 包含所有 info 行和最终 bestmove。
 */
export interface InfoAndMove {
  /** 搜索过程中所有 info 行的解析结果, 按 depth 递增 */
  pvList: Info[];
  /** 引擎推荐的最佳走法 (ICCS 格式) */
  bestmove: string | null;
  /** 引擎推荐对手应走 (ICCS 格式) */
  ponder?: string;
  /** 总搜索节点数 (从最后一行 info 提取) */
  nodes?: number;
  /** 最终 nps */
  nps?: number;
  /** 总搜索用时 */
  time?: number;
}

/** onInfo 回调类型, 用于实时推送引擎搜索信息 */
export type OnInfoCallback = (info: Info) => void;
