import { GameRecord } from '../common/GameRecord';

export interface RecoveryBuffer {
  offer(record: GameRecord): void;
  subscribe(listener: (record: GameRecord) => void): () => void;
}

export function createRecoveryBuffer(): RecoveryBuffer {
  let pending: GameRecord | undefined;
  let listener: ((record: GameRecord) => void) | undefined;

  return {
    offer(record) {
      if (listener) {
        listener(record);
      } else {
        pending = record;
      }
    },
    subscribe(nextListener) {
      listener = nextListener;
      if (pending) {
        const record = pending;
        pending = undefined;
        nextListener(record);
      }
      return () => {
        if (listener === nextListener) listener = undefined;
      };
    },
  };
}
