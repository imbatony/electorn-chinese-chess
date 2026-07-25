import { PieceArray } from './Pieces';

export type Board = ReadonlyArray<ReadonlyArray<number>>;
export type BoardPoint = readonly [number, number];

const inBoard = (x: number, y: number): boolean => x >= 0 && x < 9 && y >= 0 && y < 10;

const isRedPiece = (piece: number): boolean => piece > 0 && piece <= 7;

const isPathClear = (board: Board, x: number, y: number, tx: number, ty: number): boolean => {
  const stepX = Math.sign(tx - x);
  const stepY = Math.sign(ty - y);
  for (let px = x + stepX, py = y + stepY; px !== tx || py !== ty; px += stepX, py += stepY) {
    if (board[py][px] !== 0) {
      return false;
    }
  }
  return true;
};

const isInPalace = (x: number, y: number, isRed: boolean): boolean =>
  x >= 3 && x <= 5 && (isRed ? y >= 7 && y <= 9 : y >= 0 && y <= 2);

/**
 * Applies a move without serializing FEN. The unchanged rows remain shared because
 * boards are exposed as read-only and are never mutated by the rules service.
 */
export const applyMove = (board: Board, x: number, y: number, tx: number, ty: number): Board => {
  if (!inBoard(x, y) || !inBoard(tx, ty)) {
    throw new RangeError('Move coordinates are outside the chess board');
  }
  const piece = board[y][x];
  if (piece === 0) {
    throw new Error('Cannot move from an empty square');
  }

  const next = [...board] as Array<Array<number>>;
  if (y === ty) {
    next[y] = [...board[y]];
  } else {
    next[y] = [...board[y]];
    next[ty] = [...board[ty]];
  }
  next[y][x] = 0;
  next[ty][tx] = piece;
  return next;
};

export const findKing = (board: Board, isRed: boolean): BoardPoint | undefined => {
  const king = isRed ? 1 : 8;
  for (let y = 0; y < 10; y++) {
    for (let x = 0; x < 9; x++) {
      if (board[y][x] === king) {
        return [x, y];
      }
    }
  }
  return undefined;
};

export const areKingsFacing = (board: Board): boolean => {
  const blackKing = findKing(board, false);
  const redKing = findKing(board, true);
  if (!blackKing || !redKing || blackKing[0] !== redKing[0]) {
    return false;
  }
  const [x, blackY] = blackKing;
  const [, redY] = redKing;
  for (let y = Math.min(blackY, redY) + 1; y < Math.max(blackY, redY); y++) {
    if (board[y][x] !== 0) {
      return false;
    }
  }
  return true;
};

const attacksSquare = (
  board: Board,
  piece: number,
  x: number,
  y: number,
  tx: number,
  ty: number
): boolean => {
  const isRed = isRedPiece(piece);
  const code = PieceArray[piece - 1].GetCode().toLowerCase();
  const dx = tx - x;
  const dy = ty - y;

  switch (code) {
    case 'r':
      return (dx === 0 || dy === 0) && (dx !== 0 || dy !== 0) && isPathClear(board, x, y, tx, ty);
    case 'c': {
      if ((dx !== 0 && dy !== 0) || (dx === 0 && dy === 0)) {
        return false;
      }
      const stepX = Math.sign(dx);
      const stepY = Math.sign(dy);
      let screens = 0;
      for (let px = x + stepX, py = y + stepY; px !== tx || py !== ty; px += stepX, py += stepY) {
        if (board[py][px] !== 0) {
          screens++;
        }
      }
      return screens === 1;
    }
    case 'n': {
      const absX = Math.abs(dx);
      const absY = Math.abs(dy);
      if (!((absX === 1 && absY === 2) || (absX === 2 && absY === 1))) {
        return false;
      }
      const legX = absX === 2 ? x + dx / 2 : x;
      const legY = absY === 2 ? y + dy / 2 : y;
      return board[legY][legX] === 0;
    }
    case 'b':
      return (
        Math.abs(dx) === 2 &&
        Math.abs(dy) === 2 &&
        (isRed ? ty >= 5 : ty <= 4) &&
        board[y + dy / 2][x + dx / 2] === 0
      );
    case 'a':
      return Math.abs(dx) === 1 && Math.abs(dy) === 1 && isInPalace(tx, ty, isRed);
    case 'p':
      return (
        (dx === 0 && dy === (isRed ? -1 : 1)) ||
        ((isRed ? y <= 4 : y >= 5) && Math.abs(dx) === 1 && dy === 0)
      );
    case 'k':
      return Math.abs(dx) + Math.abs(dy) === 1 && isInPalace(tx, ty, isRed);
    default:
      return false;
  }
};

/**
 * Returns whether a square is attacked by the supplied side without allocating
 * pseudo-move arrays. Flying generals are handled by areKingsFacing().
 */
export const isSquareAttacked = (
  board: Board,
  tx: number,
  ty: number,
  attackingRed: boolean
): boolean => {
  for (let y = 0; y < 10; y++) {
    for (let x = 0; x < 9; x++) {
      const piece = board[y][x];
      if (
        piece !== 0 &&
        isRedPiece(piece) === attackingRed &&
        attacksSquare(board, piece, x, y, tx, ty)
      ) {
        return true;
      }
    }
  }
  return false;
};

/** Returns whether the named side's general is under attack. */
export const isSideInCheck = (board: Board, sideInCheckRed: boolean): boolean => {
  const king = findKing(board, sideInCheckRed);
  return Boolean(
    king && (areKingsFacing(board) || isSquareAttacked(board, king[0], king[1], !sideInCheckRed))
  );
};

/** Returns whether the named side's general is attacked, excluding flying generals. */
export const isSideAttacked = (board: Board, sideInCheckRed: boolean): boolean => {
  const king = findKing(board, sideInCheckRed);
  return Boolean(king && isSquareAttacked(board, king[0], king[1], !sideInCheckRed));
};

export const getPseudoLegalMoves = (
  board: Board,
  x: number,
  y: number
): Array<[number, number]> => {
  if (!inBoard(x, y) || board[y][x] === 0) {
    return [];
  }
  return PieceArray[board[y][x] - 1].GetAvailableMovement(x, y, board, PieceArray);
};

/** Filters a piece's pseudo-legal moves by the moving side's general safety. */
export const getLegalMovesFrom = (
  board: Board,
  x: number,
  y: number,
  movingRed: boolean
): Array<[number, number]> => {
  if (!inBoard(x, y) || board[y][x] === 0 || isRedPiece(board[y][x]) !== movingRed) {
    return [];
  }
  return getPseudoLegalMoves(board, x, y).filter(
    ([tx, ty]) => !isSideInCheck(applyMove(board, x, y, tx, ty), movingRed)
  );
};

export const isLegalMove = (
  board: Board,
  x: number,
  y: number,
  tx: number,
  ty: number,
  movingRed: boolean
): boolean => getLegalMovesFrom(board, x, y, movingRed).some(([mx, my]) => mx === tx && my === ty);

/** Returns whether a side has at least one final legal move (including escaping check). */
export const hasLegalMove = (board: Board, movingRed: boolean): boolean => {
  for (let y = 0; y < 10; y++) {
    for (let x = 0; x < 9; x++) {
      if (
        board[y][x] !== 0 &&
        isRedPiece(board[y][x]) === movingRed &&
        getLegalMovesFrom(board, x, y, movingRed).length
      ) {
        return true;
      }
    }
  }
  return false;
};
