import { applyMove, areKingsFacing, isLegalMove } from './BoardRules';
import { FEN } from './Fen';
import { BoardPoints, TryICCSToPoints } from './ICCS';
import { PieceArray } from './Pieces';

export type ValidatedEngineMove =
  | { valid: true; points: BoardPoints; nextFen: FEN }
  | { valid: false; reason: string };

export function validateEngineMove(move: string, fen: FEN): ValidatedEngineMove {
  const normalizedMove = move.trim();
  if (normalizedMove === '(none)' || normalizedMove === '0000') {
    return { valid: false, reason: '引擎没有返回可走着法' };
  }

  const points = TryICCSToPoints(normalizedMove);
  if (!points) {
    return { valid: false, reason: '引擎返回的着法格式无效' };
  }

  const [x, y, tx, ty] = points;
  const board = fen.getChessArray();
  const source = board[y][x];
  if (source === 0) {
    return { valid: false, reason: '引擎着法起点没有棋子' };
  }

  const piece = PieceArray[source - 1];
  if (piece.IsRed() !== fen.isRedTurn()) {
    return { valid: false, reason: '引擎移动了非当前方棋子' };
  }

  const reachable = piece
    .GetAvailableMovement(x, y, board, PieceArray)
    .some(([availableX, availableY]) => availableX === tx && availableY === ty);
  if (!reachable) {
    return { valid: false, reason: '引擎着法不符合棋子走法' };
  }

  const nextBoard = applyMove(board, x, y, tx, ty);
  if (areKingsFacing(nextBoard)) {
    return { valid: false, reason: '引擎着法会导致将帅照面' };
  }
  if (!isLegalMove(board, x, y, tx, ty, fen.isRedTurn())) {
    return { valid: false, reason: '引擎着法会导致己方被将军' };
  }

  const nextFen = FEN.UpdateFen(fen, x, y, tx, ty);

  return { valid: true, points, nextFen };
}
