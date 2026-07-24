import { FEN } from '../src/common/Fen';
import {
  createEmptyGameRecord,
  DEFAULT_INITIAL_FEN,
  GAME_RECORD_VERSION,
  GameRecord,
  validateGameRecord,
} from '../src/common/GameRecord';
import { ICCSToPoints } from '../src/common/ICCS';

function createRecord(moves: string[] = ['a0a1']): GameRecord {
  let fen = new FEN(DEFAULT_INITIAL_FEN);
  const entries = moves.map((iccs, index) => {
    fen = FEN.UpdateFen(fen, ...ICCSToPoints(iccs));
    return { iccs, fen: fen.getFen(), index: index + 1 };
  });

  return {
    version: GAME_RECORD_VERSION,
    metadata: {
      date: '2026-07-24T12:43:16.177Z',
      redPlayer: { type: 'human', name: '红方' },
      blackPlayer: { type: 'builtin-eleeye', name: '象眼' },
      gameMode: 'human-vs-ai',
      result: 'incomplete',
      appVersion: '0.0.16',
    },
    initialFen: DEFAULT_INITIAL_FEN,
    moves: entries,
    currentIndex: entries.length,
  };
}

describe('validateGameRecord', () => {
  it('accepts a record whose moves can be reconstructed', () => {
    expect(validateGameRecord(createRecord(['a0a1', 'a9a8']))).toEqual({
      valid: true,
      errors: [],
    });
  });

  it.each([
    ['version', (record: GameRecord) => (record.version = '2.0')],
    ['date', (record: GameRecord) => (record.metadata.date = '2026-99-24')],
    ['calendar date', (record: GameRecord) => (record.metadata.date = '2026-02-30T00:00:00Z')],
    [
      'date offset',
      (record: GameRecord) => (record.metadata.date = '2026-07-24T12:43:16+15:00'),
    ],
    ['red player type', (record: GameRecord) => (record.metadata.redPlayer.type = '')],
    ['black player name', (record: GameRecord) => (record.metadata.blackPlayer.name = '')],
    [
      'game mode',
      (record: GameRecord) =>
        (record.metadata.gameMode = 'network' as GameRecord['metadata']['gameMode']),
    ],
    [
      'result',
      (record: GameRecord) =>
        (record.metadata.result = 'unknown' as GameRecord['metadata']['result']),
    ],
    ['initial FEN', (record: GameRecord) => (record.initialFen = 'not-a-fen')],
    ['move index', (record: GameRecord) => (record.moves[0].index = 1.5)],
    ['move index sequence', (record: GameRecord) => (record.moves[0].index = 2)],
    ['current index', (record: GameRecord) => (record.currentIndex = 0.5)],
  ])('rejects an invalid %s', (_name, mutate) => {
    const record = createRecord();
    mutate(record);
    expect(validateGameRecord(record).valid).toBe(false);
  });

  it.each([
    ['invalid coordinates', 'j0a1'],
    ['an empty source square', 'a1a2'],
    ['the wrong side', 'a9a8'],
    ['illegal piece movement', 'a0b1'],
  ])('rejects %s', (_name, iccs) => {
    const record = createRecord();
    record.moves[0].iccs = iccs;
    expect(validateGameRecord(record).valid).toBe(false);
  });

  it('rejects a move that leaves its own king in check', () => {
    const record = createEmptyGameRecord(
      { type: 'human' },
      { type: 'human' },
      'human-vs-human',
      '4k4/9/9/9/9/9/9/4r4/4R4/4K4 w'
    );
    record.moves = [
      {
        iccs: 'e1d1',
        fen: '4k4/9/9/9/9/9/9/4r4/3R5/4K4 b',
        index: 1,
      },
    ];
    record.currentIndex = 1;

    expect(validateGameRecord(record).valid).toBe(false);
  });

  it('rejects a move that leaves the kings facing each other', () => {
    const record = createEmptyGameRecord(
      { type: 'human' },
      { type: 'human' },
      'human-vs-human',
      '4k4/9/9/9/9/9/9/9/4R4/4K4 w'
    );
    record.moves = [
      {
        iccs: 'e1d1',
        fen: '4k4/9/9/9/9/9/9/9/3R5/4K4 b',
        index: 1,
      },
    ];
    record.currentIndex = 1;

    expect(validateGameRecord(record).valid).toBe(false);
  });

  it('rejects a stored FEN that differs from the reconstructed result', () => {
    const record = createRecord();
    record.moves[0].fen = DEFAULT_INITIAL_FEN;

    const result = validateGameRecord(record);
    expect(result.valid).toBe(false);
    expect(result.errors.join(' ')).toContain('与着法结果不一致');
  });

  it('rejects currentIndex beyond the move list', () => {
    const record = createRecord();
    record.currentIndex = 2;
    expect(validateGameRecord(record).valid).toBe(false);
  });
});
