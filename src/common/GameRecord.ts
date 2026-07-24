/**
 * GameRecord - 棋谱保存与加载数据模型
 */
import { FEN } from './Fen';
import { TryICCSToPoints } from './ICCS';
import { validateEngineMove } from './MoveValidation';

// ============================================================================
// Types & Interfaces
// ============================================================================

/**
 * 对局结果
 */
export type GameResult = 'red_win' | 'black_win' | 'draw' | 'incomplete';
export type GameMode = 'human-vs-ai' | 'human-vs-human' | 'ai-vs-ai';

/**
 * 玩家信息
 */
export interface PlayerInfo {
  /** "human" 或引擎 key (e.g., "ELEEYE", "GG") */
  type: 'human' | string;
  /** 显示名称 (默认为 type 标签) */
  name?: string;
}

/**
 * 着法记录
 */
export interface MoveEntry {
  /** ICCS 着法表示 (e.g., "h2e2") */
  iccs: string;
  /** 走完此步后的 FEN 字符串 */
  fen: string;
  /** 1-based 着法序号 */
  index: number;
}

/**
 * 对局元数据
 */
export interface GameMetadata {
  /** ISO 8601 日期 (e.g., "2026-02-10T06:21:00Z") */
  date: string;
  /** 红方玩家信息 */
  redPlayer: PlayerInfo;
  /** 黑方玩家信息 */
  blackPlayer: PlayerInfo;
  /** 对局结果 (未完成时可省略) */
  result?: GameResult;
  /** 游戏模式 (e.g., "human-vs-ai", "human-vs-human", "ai-vs-ai") */
  gameMode: string;
  /** 创建此记录的应用版本 */
  appVersion?: string;
}

/**
 * 棋谱记录 - 完整的对局数据
 */
export interface GameRecord {
  /** Schema 版本 (e.g., "1.0") */
  version: string;
  /** 对局元数据 */
  metadata: GameMetadata;
  /** 初始局面 FEN 字符串 */
  initialFen: string;
  /** 着法序列 */
  moves: MoveEntry[];
  /** 当前查看/游玩的着法索引 (用于恢复) */
  currentIndex: number;
}

// ============================================================================
// Constants
// ============================================================================

/** 当前 schema 版本 */
export const GAME_RECORD_VERSION = '1.0';

/** 默认初始局面 FEN */
export const DEFAULT_INITIAL_FEN = 'rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR w';

/** ICCS 着法正则表达式 */
const ICCS_PATTERN = /^[a-i]\d[a-i]\d$/;
const GAME_MODES: ReadonlyArray<GameMode> = ['human-vs-ai', 'human-vs-human', 'ai-vs-ai'];
const GAME_RESULTS: ReadonlyArray<GameResult> = ['red_win', 'black_win', 'draw', 'incomplete'];
const ISO_DATE_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?(?:Z|([+-])(\d{2}):(\d{2}))$/;

// ============================================================================
// Validation
// ============================================================================

/**
 * 验证结果
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * 验证 ICCS 着法格式
 * @param iccs ICCS 字符串
 * @returns 是否合法
 */
function isValidICCS(iccs: string): boolean {
  return ICCS_PATTERN.test(iccs) && TryICCSToPoints(iccs) !== null;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isValidISODate(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const match = ISO_DATE_PATTERN.exec(value);
  if (!match || !Number.isFinite(Date.parse(value))) return false;

  const [, year, month, day, hour, minute, second, , offsetHour, offsetMinute] = match;
  const daysInMonth = new Date(Date.UTC(Number(year), Number(month), 0)).getUTCDate();
  return (
    Number(month) >= 1 &&
    Number(month) <= 12 &&
    Number(day) >= 1 &&
    Number(day) <= daysInMonth &&
    Number(hour) <= 23 &&
    Number(minute) <= 59 &&
    Number(second) <= 59 &&
    (!offsetHour ||
      (Number(offsetHour) <= 14 &&
        Number(offsetMinute) <= 59 &&
        (Number(offsetHour) < 14 || Number(offsetMinute) === 0)))
  );
}

function validatePlayer(player: unknown, field: string, errors: string[]): void {
  if (!player || typeof player !== 'object' || Array.isArray(player)) {
    errors.push(`${field} 缺失或类型错误`);
    return;
  }

  const info = player as Partial<PlayerInfo>;
  if (!isNonEmptyString(info.type)) {
    errors.push(`${field}.type 缺失或类型错误`);
  }
  if (info.name !== undefined && !isNonEmptyString(info.name)) {
    errors.push(`${field}.name 必须为非空字符串`);
  }
}

/**
 * 验证 GameRecord 完整性和合法性
 * @param record 待验证的棋谱记录
 * @returns 验证结果
 */
export function validateGameRecord(record: unknown): ValidationResult {
  const errors: string[] = [];

  // Type guard
  if (!record || typeof record !== 'object') {
    return { valid: false, errors: ['无效的记录格式：不是对象'] };
  }

  const r = record as Partial<GameRecord>;

  // Version check
  if (r.version !== GAME_RECORD_VERSION) {
    errors.push(`不支持的 version: ${String(r.version)}`);
  }

  // Metadata check
  if (!r.metadata || typeof r.metadata !== 'object') {
    errors.push('缺少 metadata 字段或类型错误');
  } else {
    const m = r.metadata as Partial<GameMetadata>;
    if (!isValidISODate(m.date)) {
      errors.push('metadata.date 不是有效的 ISO 8601 日期');
    }
    validatePlayer(m.redPlayer, 'metadata.redPlayer', errors);
    validatePlayer(m.blackPlayer, 'metadata.blackPlayer', errors);
    if (!GAME_MODES.includes(m.gameMode as GameMode)) {
      errors.push(`无效的 gameMode 值: ${String(m.gameMode)}`);
    }
    if (m.result !== undefined && !GAME_RESULTS.includes(m.result)) {
      errors.push(`无效的 result 值: ${m.result}`);
    }
    if (m.appVersion !== undefined && !isNonEmptyString(m.appVersion)) {
      errors.push('metadata.appVersion 必须为非空字符串');
    }
  }

  // Initial FEN check
  let reconstructedFen: FEN | null = null;
  if (!r.initialFen || typeof r.initialFen !== 'string') {
    errors.push('缺少 initialFen 字段或类型错误');
  } else if (!FEN.verifyFEN(r.initialFen)) {
    errors.push(`无效的初始 FEN: ${r.initialFen}`);
  } else {
    reconstructedFen = new FEN(r.initialFen);
  }

  // Moves array check
  if (!Array.isArray(r.moves)) {
    errors.push('缺少 moves 字段或不是数组');
  } else {
    r.moves.forEach((move, i) => {
      if (!move || typeof move !== 'object') {
        errors.push(`moves[${i}] 不是有效对象`);
        return;
      }
      const m = move as Partial<MoveEntry>;
      if (typeof m.iccs !== 'string' || !isValidICCS(m.iccs)) {
        errors.push(`moves[${i}].iccs 无效: ${m.iccs}`);
      } else if (reconstructedFen) {
        const validation = validateEngineMove(m.iccs, reconstructedFen);
        if (validation.valid === false) {
          errors.push(`moves[${i}].iccs 非法: ${validation.reason}`);
          reconstructedFen = null;
        } else {
          reconstructedFen = validation.nextFen;
          if (m.fen !== reconstructedFen.getFen()) {
            errors.push(`moves[${i}].fen 与着法结果不一致: 应为 ${reconstructedFen.getFen()}`);
          }
        }
      }
      if (typeof m.fen !== 'string' || !FEN.verifyFEN(m.fen)) {
        errors.push(`moves[${i}].fen 无效`);
      }
      if (!Number.isInteger(m.index) || m.index !== i + 1) {
        errors.push(`moves[${i}].index 应为 ${i + 1}, 实际为 ${m.index}`);
      }
    });
  }

  // Current index check
  if (!Number.isInteger(r.currentIndex)) {
    errors.push('缺少 currentIndex 字段或类型错误');
  } else if (r.moves && (r.currentIndex < 0 || r.currentIndex > r.moves.length)) {
    errors.push(`currentIndex 超出范围: ${r.currentIndex} (moves.length: ${r.moves?.length})`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * 创建空的 GameRecord
 * @param redPlayer 红方信息
 * @param blackPlayer 黑方信息
 * @param gameMode 游戏模式
 * @param initialFen 初始 FEN (可选)
 * @returns 新的 GameRecord
 */
export function createEmptyGameRecord(
  redPlayer: PlayerInfo,
  blackPlayer: PlayerInfo,
  gameMode: string,
  initialFen: string = DEFAULT_INITIAL_FEN
): GameRecord {
  return {
    version: GAME_RECORD_VERSION,
    metadata: {
      date: new Date().toISOString(),
      redPlayer,
      blackPlayer,
      gameMode,
      result: 'incomplete',
    },
    initialFen,
    moves: [],
    currentIndex: 0,
  };
}

/**
 * 从 JSON 字符串解析 GameRecord
 * @param json JSON 字符串
 * @returns 解析的 GameRecord 或 null
 */
export function parseGameRecord(json: string): { record: GameRecord | null; errors: string[] } {
  try {
    const parsed = JSON.parse(json);
    const validation = validateGameRecord(parsed);
    if (validation.valid) {
      return { record: parsed as GameRecord, errors: [] };
    }
    return { record: null, errors: validation.errors };
  } catch (e) {
    return { record: null, errors: [`JSON 解析错误: ${(e as Error).message}`] };
  }
}

/**
 * 序列化 GameRecord 为 JSON 字符串
 * @param record GameRecord
 * @returns JSON 字符串
 */
export function stringifyGameRecord(record: GameRecord): string {
  return JSON.stringify(record, null, 2);
}
