/**
 * PgnExporter - PGN 格式导出器
 * 
 * 将 GameRecord 导出为 PGN (Portable Game Notation) 中国象棋格式
 * 
 * @see specs/001-game-record-save-load/data-model.md
 */

import { GameRecord, GameResult } from './GameRecord';

/**
 * PGN 结果值映射
 */
const RESULT_MAP: Record<GameResult, string> = {
  red_win: '1-0',
  black_win: '0-1',
  draw: '1/2-1/2',
  incomplete: '*',
};

export class PgnExporter {
  /**
   * 将 GameRecord 转换为 PGN 字符串
   * @param record 棋谱记录
   * @returns PGN 格式字符串
   */
  public static toPgn(record: GameRecord): string {
    const lines: string[] = [];

    // 生成 PGN 头部
    lines.push(...PgnExporter.generateHeaders(record));
    lines.push('');

    // 生成着法序列
    lines.push(PgnExporter.generateMoveText(record));

    return lines.join('\n');
  }

  /**
   * 生成 PGN 头部标签
   */
  private static generateHeaders(record: GameRecord): string[] {
    const headers: string[] = [];
    const meta = record.metadata;

    // 基本标签
    headers.push('[Game "Chinese Chess"]');
    
    // 日期 (PGN 格式: YYYY.MM.DD)
    const date = new Date(meta.date);
    const dateStr = `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
    headers.push(`[Date "${dateStr}"]`);

    // 红方
    const redName = meta.redPlayer.name || PgnExporter.getPlayerDisplayName(meta.redPlayer.type);
    headers.push(`[Red "${redName}"]`);

    // 黑方
    const blackName = meta.blackPlayer.name || PgnExporter.getPlayerDisplayName(meta.blackPlayer.type);
    headers.push(`[Black "${blackName}"]`);

    // 结果
    const result = RESULT_MAP[meta.result || 'incomplete'];
    headers.push(`[Result "${result}"]`);

    // FEN (如果不是标准初始局面)
    const standardFen = 'rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR w';
    if (record.initialFen !== standardFen) {
      headers.push(`[FEN "${record.initialFen}"]`);
    }

    return headers;
  }

  /**
   * 获取玩家显示名称
   */
  private static getPlayerDisplayName(type: string): string {
    if (type === 'human') {
      return 'Human';
    }
    // 引擎名称映射
    const engineNames: Record<string, string> = {
      ELEEYE: '象眼',
      GG: '佳佳',
      SACHESS: '南奥',
    };
    return engineNames[type] || type;
  }

  /**
   * 生成着法文本
   */
  private static generateMoveText(record: GameRecord): string {
    if (record.moves.length === 0) {
      return RESULT_MAP[record.metadata.result || 'incomplete'];
    }

    const moveTexts: string[] = [];
    
    for (let i = 0; i < record.moves.length; i += 2) {
      const moveNumber = Math.floor(i / 2) + 1;
      const redMove = record.moves[i];
      const blackMove = record.moves[i + 1];

      if (blackMove) {
        moveTexts.push(`${moveNumber}. ${redMove.iccs} ${blackMove.iccs}`);
      } else {
        moveTexts.push(`${moveNumber}. ${redMove.iccs}`);
      }
    }

    // 添加结果
    const result = RESULT_MAP[record.metadata.result || 'incomplete'];
    moveTexts.push(result);

    return moveTexts.join(' ');
  }
}
