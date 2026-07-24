import { FEN } from '../src/common/Fen';
import { DEFAULT_INITIAL_FEN, GAME_RECORD_VERSION, GameRecord } from '../src/common/GameRecord';
import { ICCSToPoints } from '../src/common/ICCS';
import { writeAutoSave } from '../src/main/gameRecordOperations';
import { EngineQueryTracker, isSamePosition } from '../src/renderer/engineQuery';
import {
  continueHistory,
  getRecordSides,
  loadHistory,
  mutationIsDirty,
  restartHistory,
  snapshotHistory,
} from '../src/renderer/gameHistory';
import { createRecoveryBuffer } from '../src/renderer/recoveryBuffer';

function createRecord(moves = ['a0a1', 'a9a8']): GameRecord {
  let fen = new FEN(DEFAULT_INITIAL_FEN);
  const entries = moves.map((iccs, index) => {
    fen = FEN.UpdateFen(fen, ...ICCSToPoints(iccs));
    return { iccs, fen: fen.getFen(), index: index + 1 };
  });
  return {
    version: GAME_RECORD_VERSION,
    metadata: {
      date: '2026-07-24T12:43:16.177Z',
      redPlayer: { type: 'human' },
      blackPlayer: { type: 'builtin-eleeye' },
      gameMode: 'human-vs-ai',
      result: 'incomplete',
    },
    initialFen: DEFAULT_INITIAL_FEN,
    moves: entries,
    currentIndex: 1,
  };
}

describe('game state helpers', () => {
  it('buffers startup recovery until the router subscribes', () => {
    const buffer = createRecoveryBuffer();
    const record = createRecord();
    const listener = jest.fn();

    buffer.offer(record);
    buffer.subscribe(listener);

    expect(listener).toHaveBeenCalledWith(record);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('loads sides-independent history at the saved index in playback mode', () => {
    const history = loadHistory(createRecord());

    expect(history.fenArray).toHaveLength(3);
    expect(history.index).toBe(1);
    expect(history.isPlaybackMode).toBe(true);
    expect(history.initialFen).toBe(DEFAULT_INITIAL_FEN);
    expect(getRecordSides(createRecord())).toEqual({
      red: 'human',
      black: 'builtin-eleeye',
    });
    expect(mutationIsDirty('load')).toBe(false);
    expect(mutationIsDirty('load', true)).toBe(true);
  });

  it('restarts with a fresh initial-position history and marks the change dirty', () => {
    const history = restartHistory();

    expect(history.fenArray).toHaveLength(1);
    expect(history.index).toBe(0);
    expect(history.isPlaybackMode).toBe(false);
    expect(history.initialFen).toBe(DEFAULT_INITIAL_FEN);
    expect(mutationIsDirty('restart')).toBe(true);
  });

  it('restarts a custom-start game from its active initial position', () => {
    const customInitialFen = '4k4/9/9/9/4p4/9/9/9/9/4K4 w';
    const history = restartHistory(customInitialFen);
    const moved = FEN.UpdateFen(history.fenArray[0], ...ICCSToPoints('e0e1'));

    expect(history.fenArray).toHaveLength(1);
    expect(history.fenArray[0].getFen()).toBe(customInitialFen);
    expect(history.fenArray[0].getFenWithMove()).toBe(`${customInitialFen} - - 0 1`);
    expect(moved.getFenWithMove()).toBe(`${customInitialFen} - - 0 1 moves e0e1`);
    expect(history.initialFen).toBe(customInitialFen);
    expect(history.index).toBe(0);
    expect(history.isPlaybackMode).toBe(false);
    expect(mutationIsDirty('restart')).toBe(true);
  });

  it('continues from the viewed position and truncates future moves', () => {
    const loaded = loadHistory(createRecord());
    const continued = continueHistory(loaded);

    expect(continued.fenArray).toHaveLength(2);
    expect(continued.index).toBe(1);
    expect(continued.isPlaybackMode).toBe(false);
    expect(mutationIsDirty('continue')).toBe(true);
  });

  it('snapshots all retained history independently of the viewing index', () => {
    const history = loadHistory(createRecord());

    expect(history.index).toBe(1);
    expect(snapshotHistory(history.fenArray)).toHaveLength(3);
  });

  it('preserves a loaded custom initial FEN in engine queries', () => {
    const customInitialFen = '4k4/9/9/9/4p4/9/9/9/9/4K4 w';
    const history = loadHistory({
      ...createRecord([]),
      initialFen: customInitialFen,
      moves: [
        {
          iccs: 'e0e1',
          fen: '4k4/9/9/9/4p4/9/9/9/4K4/9 b',
          index: 1,
        },
      ],
      currentIndex: 1,
    });

    expect(history.fenArray[0].getFenWithMove()).toBe(`${customInitialFen} - - 0 1`);
    expect(history.fenArray[1].getFenWithMove()).toBe(`${customInitialFen} - - 0 1 moves e0e1`);
  });

  it('matches animated moves only to their exact source position revision', () => {
    const source = { key: 'fen-a', revision: 4 };

    expect(isSamePosition(source, { key: 'fen-a', revision: 4 })).toBe(true);
    expect(isSamePosition(source, { key: 'fen-b', revision: 4 })).toBe(false);
    expect(isSamePosition(source, { key: 'fen-a', revision: 5 })).toBe(false);
  });

  it('accepts only the latest engine request for the current position', () => {
    const tracker = new EngineQueryTracker();
    const first = tracker.start('fen-a', 1)!;
    const second = tracker.start('fen-b', 2)!;
    const third = tracker.start('fen-b', 3)!;

    expect(second.id).toBeGreaterThan(first.id);
    expect(third.id).toBeGreaterThan(second.id);
    expect(tracker.isFresh(first, 'fen-a', 1)).toBe(false);
    expect(tracker.isFresh(second, 'fen-b', 2)).toBe(false);
    expect(tracker.isFresh(third, 'fen-b', 3)).toBe(true);

    tracker.finish(first);
    tracker.finish(second);
    expect(tracker.start('fen-b', 3)).toBeUndefined();

    tracker.finish(third);
    expect(tracker.isFresh(third, 'fen-b', 3)).toBe(false);
  });

  it('returns an explicit autosave failure response', () => {
    const writer = {
      autoSave: jest.fn(() => {
        throw new Error('disk full');
      }),
    };

    expect(writeAutoSave(writer, createRecord())).toEqual({
      success: false,
      error: 'disk full',
    });
  });
});
