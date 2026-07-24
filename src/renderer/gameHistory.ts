import { FEN } from '../common/Fen';
import { DEFAULT_INITIAL_FEN, GameRecord } from '../common/GameRecord';
import { ICCSToPoints } from '../common/ICCS';

export interface GameHistory {
  fenArray: FEN[];
  index: number;
  initialFen: string;
  isPlaybackMode: boolean;
}

export type HistoryMutation = 'move' | 'undo' | 'restart' | 'load' | 'continue' | null;

export function mutationIsDirty(mutation: HistoryMutation, recovered = false): boolean {
  return mutation === 'load' ? recovered : mutation !== null;
}

export function getRecordSides(record: GameRecord): { red: string; black: string } {
  return {
    red: record.metadata.redPlayer.type,
    black: record.metadata.blackPlayer.type,
  };
}

export function loadHistory(record: GameRecord): GameHistory {
  const fenArray = [new FEN(record.initialFen)];
  for (const move of record.moves) {
    const [x, y, tx, ty] = ICCSToPoints(move.iccs);
    fenArray.push(FEN.UpdateFen(fenArray[fenArray.length - 1], x, y, tx, ty));
  }
  return {
    fenArray,
    index: record.currentIndex,
    initialFen: record.initialFen,
    isPlaybackMode: true,
  };
}

export function restartHistory(initialFen: string = DEFAULT_INITIAL_FEN): GameHistory {
  return {
    fenArray: [new FEN(initialFen)],
    index: 0,
    initialFen,
    isPlaybackMode: false,
  };
}

export function continueHistory(history: GameHistory): GameHistory {
  return {
    ...history,
    fenArray: history.fenArray.slice(0, history.index + 1),
    isPlaybackMode: false,
  };
}

export function snapshotHistory(fenArray: FEN[]): FEN[] {
  return fenArray.slice();
}
