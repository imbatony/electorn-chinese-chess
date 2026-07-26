import { isEngineDifficulty } from './EngineDifficulty';
import { FEN } from './Fen';
import {
  AboutAdjustWindowRequest,
  BgmStatus,
  BoardStatus,
  PlayerSides,
  QueryMoveRequest,
} from './IPCInfos';

const isObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

export function isQueryMoveRequest(value: unknown): value is QueryMoveRequest {
  if (!isObject(value)) return false;
  const difficulty = value.difficulty;
  return (
    typeof value.fenStr === 'string' &&
    FEN.verifyFEN(value.fenStr) &&
    (difficulty === null || isEngineDifficulty(difficulty)) &&
    typeof value.turn === 'boolean'
  );
}

export function isBoardStatus(value: unknown): value is BoardStatus | null {
  if (value === null) return true;
  if (!isObject(value)) return false;
  return (
    typeof value.curFen === 'string' &&
    FEN.verifyFEN(value.curFen) &&
    typeof value.canBack === 'boolean' &&
    typeof value.isEnd === 'boolean' &&
    (value.moveCount === undefined ||
      (typeof value.moveCount === 'number' && Number.isInteger(value.moveCount))) &&
    (value.isPlaybackMode === undefined || typeof value.isPlaybackMode === 'boolean')
  );
}

export function isBgmStatus(value: unknown): value is BgmStatus {
  return (
    isObject(value) &&
    typeof value.enabled === 'boolean' &&
    (value.type === 'welcome' || value.type === 'board')
  );
}

export function isPlayerSides(
  value: unknown,
  isKnownPlayer: (playerId: string) => boolean
): value is PlayerSides {
  return (
    isObject(value) &&
    typeof value.red === 'string' &&
    typeof value.black === 'string' &&
    isKnownPlayer(value.red) &&
    isKnownPlayer(value.black)
  );
}

export function isAboutAdjustWindowRequest(value: unknown): value is AboutAdjustWindowRequest {
  return (
    isObject(value) &&
    typeof value.height === 'number' &&
    Number.isFinite(value.height) &&
    value.height > 0 &&
    value.height <= 2000 &&
    typeof value.width === 'number' &&
    Number.isFinite(value.width) &&
    value.width > 0 &&
    value.width <= 2000 &&
    typeof value.showCloseButton === 'boolean'
  );
}

export function isAllowedExternalUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  try {
    const protocol = new URL(value).protocol;
    return protocol === 'http:' || protocol === 'https:';
  } catch {
    return false;
  }
}
