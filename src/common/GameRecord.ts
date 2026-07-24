/**
 * GameRecord - 棋谱保存与加载数据模型
 */

import { FEN } from './Fen';

// ============================================================================
// Types & Interfaces
// ============================================================================

/**
 * 对局结果
 */
export type GameResult = 'red_win' | 'black_win' | 'draw' | 'incomplete';

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
export function isValidICCS(iccs: string): boolean {
  return ICCS_PATTERN.test(iccs);
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
  if (!r.version || typeof r.version !== 'string') {
    errors.push('缺少 version 字段或类型错误');
  }

  // Metadata check
  if (!r.metadata || typeof r.metadata !== 'object') {
    errors.push('缺少 metadata 字段或类型错误');
  } else {
    const m = r.metadata as Partial<GameMetadata>;
    if (!m.date || typeof m.date !== 'string') {
      errors.push('metadata.date 缺失或类型错误');
    }
    if (!m.redPlayer || typeof m.redPlayer !== 'object') {
      errors.push('metadata.redPlayer 缺失或类型错误');
    }
    if (!m.blackPlayer || typeof m.blackPlayer !== 'object') {
      errors.push('metadata.blackPlayer 缺失或类型错误');
    }
    if (!m.gameMode || typeof m.gameMode !== 'string') {
      errors.push('metadata.gameMode 缺失或类型错误');
    }
    if (m.result !== undefined && !['red_win', 'black_win', 'draw', 'incomplete'].includes(m.result)) {
      errors.push(`无效的 result 值: ${m.result}`);
    }
  }

  // Initial FEN check
  if (!r.initialFen || typeof r.initialFen !== 'string') {
    errors.push('缺少 initialFen 字段或类型错误');
  } else if (!FEN.verifyFEN(r.initialFen)) {
    errors.push(`无效的初始 FEN: ${r.initialFen}`);
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
      if (!m.iccs || !isValidICCS(m.iccs)) {
        errors.push(`moves[${i}].iccs 无效: ${m.iccs}`);
      }
      if (!m.fen || !FEN.verifyFEN(m.fen)) {
        errors.push(`moves[${i}].fen 无效`);
      }
      if (typeof m.index !== 'number' || m.index !== i + 1) {
        errors.push(`moves[${i}].index 应为 ${i + 1}, 实际为 ${m.index}`);
      }
    });
  }

  // Current index check
  if (typeof r.currentIndex !== 'number') {
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
