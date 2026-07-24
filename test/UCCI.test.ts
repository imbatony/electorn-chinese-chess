import os from 'os';
import path from 'path';

import { ChessEngine, parseInfoLine } from '../src/main/UCCI';

// ========================================================================
// parseInfoLine 单元测试 (T024)
// ========================================================================

describe('parseInfoLine', () => {
  it('should parse standard UCI info line', () => {
    const line =
      'info depth 10 seldepth 15 score cp 35 nodes 12345 nps 67890 time 183 pv e2e4 d7d5 g1f3';
    const result = parseInfoLine(line);
    expect(result).not.toBeNull();
    expect(result!.depth).toBe(10);
    expect(result!.seldepth).toBe(15);
    expect(result!.score).toBe(35);
    expect(result!.scoreType).toBe('cp');
    expect(result!.nodes).toBe(12345);
    expect(result!.nps).toBe(67890);
    expect(result!.time).toBe(183);
    expect(result!.pv).toEqual(['e2e4', 'd7d5', 'g1f3']);
  });

  it('should parse UCCI info line (score without cp/mate prefix)', () => {
    const line = 'info depth 8 score 120 pv h2e2 h9g7';
    const result = parseInfoLine(line);
    expect(result).not.toBeNull();
    expect(result!.depth).toBe(8);
    expect(result!.score).toBe(120);
    expect(result!.scoreType).toBe('cp');
    expect(result!.pv).toEqual(['h2e2', 'h9g7']);
  });

  it('should parse score mate', () => {
    const line = 'info depth 15 score mate 5 pv e2e4';
    const result = parseInfoLine(line);
    expect(result).not.toBeNull();
    expect(result!.score).toBe(5);
    expect(result!.scoreType).toBe('mate');
  });

  it('should parse negative score cp', () => {
    const line = 'info depth 12 score cp -150 pv d7d5';
    const result = parseInfoLine(line);
    expect(result).not.toBeNull();
    expect(result!.score).toBe(-150);
    expect(result!.scoreType).toBe('cp');
  });

  it('should parse multipv', () => {
    const line = 'info depth 10 multipv 2 score cp 20 pv e2e4';
    const result = parseInfoLine(line);
    expect(result).not.toBeNull();
    expect(result!.multipv).toBe(2);
  });

  it('should handle variable-length pv (1 move)', () => {
    const line = 'info depth 1 score cp 30 pv e2e4';
    const result = parseInfoLine(line);
    expect(result).not.toBeNull();
    expect(result!.pv).toEqual(['e2e4']);
  });

  it('should handle variable-length pv (10 moves)', () => {
    const moves = 'e2e4 d7d5 g1f3 b8c6 f1b5 a7a6 b5a4 g8f6 e1g1 f8e7';
    const line = `info depth 20 score cp 25 pv ${moves}`;
    const result = parseInfoLine(line);
    expect(result).not.toBeNull();
    expect(result!.pv).toHaveLength(10);
  });

  it('should return null for info line without depth', () => {
    const line = 'info string some engine message';
    const result = parseInfoLine(line);
    expect(result).toBeNull();
  });

  it('should return null for non-info line', () => {
    const result = parseInfoLine('bestmove e2e4 ponder d7d5');
    expect(result).toBeNull();
  });

  it('should return null for empty string', () => {
    const result = parseInfoLine('');
    expect(result).toBeNull();
  });
});
// Integration test: uses actual GG engine binary
test('Test GG Engine with ChessEngine constructor', async () => {
  let basePath = process.resourcesPath;
  if (process.env.NODE_ENV === 'development' || !process.resourcesPath) {
    basePath = path.join(process.cwd(), 'assets');
  }
  const ggFilePath = path.join(basePath, 'engine/gg20180531/NewGG.exe');

  const engine = new ChessEngine(ggFilePath, '佳佳', 'uci', os.cpus().length);
  try {
    const init = await engine.initEngine();
    console.log(init);
    const infoAndMove = await engine.infoAndMove(
      'rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR w - - 0 1 moves h2e2',
      { difficulty: 1, maxTime: 3000 }
    );
    expect(infoAndMove.bestmove).not.toBeNull();
    expect(infoAndMove.pvList.length).toBeGreaterThan(0);
  } finally {
    await engine.quit();
  }
}, 15000);
