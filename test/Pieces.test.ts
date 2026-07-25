import {
  applyMove,
  areKingsFacing,
  getLegalMovesFrom,
  hasLegalMove,
  isSideInCheck,
} from '../src/common/BoardRules';
import { FEN } from '../src/common/Fen';
import {
  Advisor,
  Bishop,
  Cannon,
  King,
  Knight,
  Pawn,
  PieceArray,
  Rook,
} from '../src/common/Pieces';
import { GetChineseMovementNameForSimpleChess } from '../src/common/pieces/BaseChess';

test('Test King', () => {
  const red = new King(true);
  const black = new King(false);
  //red
  expect(red.GetName()).toBe('帅');
  expect(red.GetCode()).toBe('K');
  //black
  expect(black.GetName()).toBe('将');
  expect(black.GetCode()).toBe('k');

  let fen = new FEN('4k4/9/9/9/9/9/9/9/9/5K3 w - - 0 1');
  let board = fen.getChessArray();
  expect(red.GetChineseMovementName(5, 9, 5, 8, board)).toBe('帅四进一');
  expect(black.GetChineseMovementName(4, 0, 4, 1, board)).toBe('将5进1');
  let m = red.GetAvailableMovement(5, 9, board, PieceArray);
  expect(m.length).toBe(2);
  expect(m).toContainEqual([5, 8]);
  expect(m).toContainEqual([4, 9]);
  m = black.GetAvailableMovement(4, 0, board, PieceArray);
  expect(m.length).toBe(3);
  expect(m).toContainEqual([4, 1]);
  expect(m).toContainEqual([3, 0]);
  expect(m).toContainEqual([5, 0]);

  fen = new FEN('3k5/9/9/9/9/9/9/3A5/9/4K4 w');
  board = fen.getChessArray();
  m = red.GetAvailableMovement(4, 9, board, PieceArray);
  expect(m.length).toBe(3);
  expect(m).toContainEqual([4, 8]);
  expect(m).toContainEqual([5, 9]);
  expect(m).toContainEqual([3, 9]);

  fen = new FEN('3k5/9/9/9/9/9/9/9/4A4/3CK4 w');
  board = fen.getChessArray();
  m = red.GetAvailableMovement(4, 9, board, PieceArray);
  expect(m.length).toBe(1);
  expect(m).toContainEqual([5, 9]);

  fen = new FEN('3k5/9/9/9/9/9/9/3C5/4A4/4K4 w');
  board = fen.getChessArray();
  m = red.GetAvailableMovement(4, 9, board, PieceArray);
  expect(m.length).toBe(2);
  expect(m).toContainEqual([5, 9]);
  expect(m).toContainEqual([3, 9]);
});

test('Test Advisor', () => {
  const red = new Advisor(true);
  const black = new Advisor(false);
  //red
  expect(red.GetName()).toBe('仕');
  expect(red.GetCode()).toBe('A');
  //black
  expect(black.GetName()).toBe('士');
  expect(black.GetCode()).toBe('a');
});

describe.each([
  {
    name: 'red',
    piece: new Advisor(true),
    center: [4, 8] as const,
    targets: [
      [3, 9],
      [5, 9],
      [3, 7],
      [5, 7],
    ] as [number, number][],
    own: 'A',
    enemy: 'a',
  },
  {
    name: 'black',
    piece: new Advisor(false),
    center: [4, 1] as const,
    targets: [
      [3, 0],
      [5, 0],
      [3, 2],
      [5, 2],
    ] as [number, number][],
    own: 'a',
    enemy: 'A',
  },
])('$name advisor movement', ({ piece, center, targets, own, enemy }) => {
  const ownIndex = PieceArray.findIndex((candidate) => candidate.GetCode() === own) + 1;
  const enemyIndex = PieceArray.findIndex((candidate) => candidate.GetCode() === enemy) + 1;

  test('can move in all four directions on an empty palace', () => {
    const board = Array.from({ length: 10 }, () => Array<number>(9).fill(0));
    expect(piece.GetAvailableMovement(center[0], center[1], board, PieceArray)).toEqual(
      expect.arrayContaining(targets)
    );
  });

  test.each(targets.map((target) => [target] as const))(
    'rejects own occupancy and accepts enemy occupancy at %j',
    (target) => {
      const board = Array.from({ length: 10 }, () => Array<number>(9).fill(0));
      board[target[1]][target[0]] = ownIndex;
      expect(
        piece.GetAvailableMovement(center[0], center[1], board, PieceArray)
      ).not.toContainEqual(target);
      board[target[1]][target[0]] = enemyIndex;
      expect(piece.GetAvailableMovement(center[0], center[1], board, PieceArray)).toContainEqual(
        target
      );
    }
  );
});

test('formats simple Chinese movement names', () => {
  expect(GetChineseMovementNameForSimpleChess(4, 9, 4, 8, true, '帅')).toBe('帅五进一');
  expect(GetChineseMovementNameForSimpleChess(4, 0, 4, 2, false, '将')).toBe('将5进2');
  expect(GetChineseMovementNameForSimpleChess(7, 7, 4, 7, true, '车')).toBe('车二平五');
  expect(GetChineseMovementNameForSimpleChess(1, 2, 4, 2, false, '车')).toBe('车2平5');
  expect(GetChineseMovementNameForSimpleChess(4, 8, 3, 7, true, '仕')).toBe('仕五进六');
  expect(GetChineseMovementNameForSimpleChess(4, 1, 5, 2, false, '士')).toBe('士5进6');
});

test('King rejects out-of-bounds source coordinates', () => {
  const king = new King(true);
  const board = new FEN().getChessArray();
  expect(king.GetAvailableMovement(-1, 9, board, PieceArray)).toEqual([]);
  expect(king.GetAvailableMovement(4, 10, board, PieceArray)).toEqual([]);
});
test('Test Bishop', () => {
  const red = new Bishop(true);
  const black = new Bishop(false);
  //red
  expect(red.GetName()).toBe('相');
  expect(red.GetCode()).toBe('B');
  //black
  expect(black.GetName()).toBe('象');
  expect(black.GetCode()).toBe('b');
});

test('Test Knight', () => {
  const red = new Knight(true);
  const black = new Knight(false);
  //red
  expect(red.GetName()).toBe('马');
  expect(red.GetCode()).toBe('N');
  //black
  expect(black.GetName()).toBe('马');
  expect(black.GetCode()).toBe('n');
});

test('Test Rook', () => {
  const red = new Rook(true);
  const black = new Rook(false);
  //red
  expect(red.GetName()).toBe('车');
  expect(red.GetCode()).toBe('R');
  //black
  expect(black.GetName()).toBe('车');
  expect(black.GetCode()).toBe('r');
});

test('Test Cannon', () => {
  const red = new Cannon(true);
  const black = new Cannon(false);
  //red
  expect(red.GetName()).toBe('炮');
  expect(red.GetCode()).toBe('C');
  //black
  expect(black.GetName()).toBe('炮');
  expect(black.GetCode()).toBe('c');
});

test('Test Pawn', () => {
  const red = new Pawn(true);
  const black = new Pawn(false);
  //red
  expect(red.GetName()).toBe('兵');
  expect(red.GetCode()).toBe('P');
  //black
  expect(black.GetName()).toBe('卒');
  expect(black.GetCode()).toBe('p');
});

const emptyBoard = () => Array.from({ length: 10 }, () => Array<number>(9).fill(0));
const piece = (code: string) =>
  PieceArray.findIndex((candidate) => candidate.GetCode() === code) + 1;

describe('all pieces generate pseudo-legal moves', () => {
  test('rook stops at friendly pieces and includes one enemy capture in every direction', () => {
    const board = emptyBoard();
    board[5][4] = piece('R');
    board[3][4] = piece('P');
    board[7][4] = piece('p');
    board[5][2] = piece('P');
    board[5][6] = piece('p');
    const moves = new Rook(true).GetAvailableMovement(4, 5, board, PieceArray);
    expect(moves).toEqual(
      expect.arrayContaining([
        [4, 4],
        [4, 6],
        [4, 7],
        [3, 5],
        [5, 5],
        [6, 5],
      ])
    );
    [
      [4, 3],
      [4, 8],
      [2, 5],
      [1, 5],
      [7, 5],
    ].forEach((target) => expect(moves).not.toContainEqual(target));
  });

  test('cannon moves before a screen and captures exactly one enemy behind it', () => {
    const board = emptyBoard();
    board[5][4] = piece('C');
    board[3][4] = piece('P');
    board[1][4] = piece('p');
    board[7][4] = piece('p');
    board[9][4] = piece('p');
    const moves = new Cannon(true).GetAvailableMovement(4, 5, board, PieceArray);
    expect(moves).toEqual(
      expect.arrayContaining([
        [4, 4],
        [4, 1],
        [4, 6],
        [4, 9],
        [3, 5],
        [8, 5],
      ])
    );
    [
      [4, 3],
      [4, 2],
      [4, 7],
      [4, 8],
    ].forEach((target) => expect(moves).not.toContainEqual(target));

    const doubleScreen = emptyBoard();
    doubleScreen[5][4] = piece('C');
    doubleScreen[6][4] = piece('P');
    doubleScreen[7][4] = piece('p');
    doubleScreen[8][4] = piece('p');
    expect(
      new Cannon(true).GetAvailableMovement(4, 5, doubleScreen, PieceArray)
    ).not.toContainEqual([4, 8]);
  });

  test('knight observes all legs, occupancy, and board edges', () => {
    const board = emptyBoard();
    board[4][4] = piece('N');
    const knight = new Knight(true);
    expect(knight.GetAvailableMovement(4, 4, board, PieceArray)).toHaveLength(8);
    board[3][4] = piece('P');
    board[4][5] = piece('P');
    board[5][2] = piece('p');
    const moves = knight.GetAvailableMovement(4, 4, board, PieceArray);
    [
      [3, 2],
      [5, 2],
      [6, 3],
    ].forEach((target) => expect(moves).not.toContainEqual(target));
    expect(moves).toContainEqual([2, 5]);
    expect(knight.GetAvailableMovement(0, 0, board, PieceArray)).toEqual(
      expect.arrayContaining([
        [1, 2],
        [2, 1],
      ])
    );
  });

  test('bishop observes elephant eyes, river, occupancy, and board edges', () => {
    const board = emptyBoard();
    board[7][4] = piece('B');
    board[6][5] = piece('P');
    board[5][2] = piece('p');
    const moves = new Bishop(true).GetAvailableMovement(4, 7, board, PieceArray);
    expect(moves).not.toContainEqual([6, 5]);
    expect(moves).toContainEqual([2, 5]);
    expect(moves).toEqual(
      expect.arrayContaining([
        [2, 9],
        [6, 9],
      ])
    );

    const riverBoard = emptyBoard();
    riverBoard[5][4] = piece('B');
    expect(new Bishop(true).GetAvailableMovement(4, 5, riverBoard, PieceArray)).not.toEqual(
      expect.arrayContaining([
        [2, 3],
        [6, 3],
      ])
    );
  });

  test.each([
    [true, 4, 5, [[4, 4]]],
    [false, 4, 4, [[4, 5]]],
  ])(
    'pawn only moves forward before crossing and gains horizontal moves after crossing',
    (isRed, x, beforeRiverY, before) => {
      const pawn = new Pawn(isRed);
      const board = emptyBoard();
      board[beforeRiverY][x] = piece(isRed ? 'P' : 'p');
      expect(pawn.GetAvailableMovement(x, beforeRiverY, board, PieceArray)).toEqual(
        expect.arrayContaining(before)
      );
      const afterRiverY = isRed ? 4 : 5;
      board[beforeRiverY][x] = 0;
      board[afterRiverY][x] = piece(isRed ? 'P' : 'p');
      expect(pawn.GetAvailableMovement(x, afterRiverY, board, PieceArray)).toEqual(
        expect.arrayContaining([
          [x - 1, afterRiverY],
          [x + 1, afterRiverY],
        ])
      );
    }
  );
});

describe('Chinese XQBase notation', () => {
  test.each([
    [new Rook(true), 'R', 7, 7, 4, 7, '车二平五'],
    [new Cannon(false), 'c', 1, 2, 4, 2, '炮2平5'],
    [new Knight(true), 'N', 7, 7, 6, 5, '马二进三'],
    [new Pawn(true), 'P', 4, 6, 4, 5, '兵五进一'],
    [new Pawn(false), 'p', 4, 3, 4, 4, '卒5进1'],
  ])('formats ordinary %s moves', (chess, code, x, y, tx, ty, expected) => {
    const board = emptyBoard();
    board[y][x] = piece(code);
    expect(chess.GetChineseMovementName(x, y, tx, ty, board)).toBe(expected);
  });

  test('uses front and rear labels for same-file rooks, cannons, and knights', () => {
    const board = emptyBoard();
    board[7][4] = piece('R');
    board[9][4] = piece('R');
    board[2][6] = piece('c');
    board[0][6] = piece('c');
    board[5][2] = piece('N');
    board[7][2] = piece('N');
    expect(new Rook(true).GetChineseMovementName(4, 7, 4, 6, board)).toBe('前车进一');
    expect(new Rook(true).GetChineseMovementName(4, 9, 4, 8, board)).toBe('后车进一');
    expect(new Cannon(false).GetChineseMovementName(6, 2, 6, 3, board)).toBe('前炮进1');
    expect(new Knight(true).GetChineseMovementName(2, 7, 3, 5, board)).toBe('后马进六');
  });

  test('uses ordinal labels for more than three same-file pawns', () => {
    const board = emptyBoard();
    [1, 3, 5, 7, 9].forEach((y) => (board[y][4] = piece('P')));
    const pawn = new Pawn(true);
    expect(pawn.GetChineseMovementName(4, 1, 4, 0, board)).toBe('一兵进一');
    expect(pawn.GetChineseMovementName(4, 3, 4, 2, board)).toBe('二兵进一');
    expect(pawn.GetChineseMovementName(4, 5, 4, 4, board)).toBe('三兵进一');
    expect(pawn.GetChineseMovementName(4, 7, 4, 6, board)).toBe('四兵进一');
    expect(pawn.GetChineseMovementName(4, 9, 4, 8, board)).toBe('五兵进一');
  });

  test('uses front/rear and front/middle/rear for two and three same-file pawns', () => {
    const twoPawns = emptyBoard();
    twoPawns[5][4] = piece('P');
    twoPawns[7][4] = piece('P');
    expect(new Pawn(true).GetChineseMovementName(4, 5, 4, 4, twoPawns)).toBe('前兵进一');
    expect(new Pawn(true).GetChineseMovementName(4, 7, 4, 6, twoPawns)).toBe('后兵进一');

    const threePawns = emptyBoard();
    threePawns[2][4] = piece('p');
    threePawns[4][4] = piece('p');
    threePawns[6][4] = piece('p');
    expect(new Pawn(false).GetChineseMovementName(4, 2, 4, 3, threePawns)).toBe('后卒进1');
    expect(new Pawn(false).GetChineseMovementName(4, 4, 4, 5, threePawns)).toBe('中卒进1');
    expect(new Pawn(false).GetChineseMovementName(4, 6, 4, 7, threePawns)).toBe('前卒进1');
  });

  test('numbers stacked pawns across files from right to left and front to rear', () => {
    const board = emptyBoard();
    [5, 7].forEach((y) => {
      board[y][0] = piece('P');
      board[y][2] = piece('P');
    });
    const pawn = new Pawn(true);
    expect(pawn.GetChineseMovementName(2, 5, 1, 5, board)).toBe('一兵平八');
    expect(pawn.GetChineseMovementName(2, 7, 1, 7, board)).toBe('二兵平八');
    expect(pawn.GetChineseMovementName(0, 5, 1, 5, board)).toBe('三兵平八');
    expect(pawn.GetChineseMovementName(0, 7, 1, 7, board)).toBe('四兵平八');

    const blackBoard = emptyBoard();
    [2, 4].forEach((y) => {
      blackBoard[y][2] = piece('p');
      blackBoard[y][4] = piece('p');
    });
    const blackPawn = new Pawn(false);
    expect(blackPawn.GetChineseMovementName(2, 4, 3, 4, blackBoard)).toBe('一卒平4');
    expect(blackPawn.GetChineseMovementName(4, 2, 3, 2, blackBoard)).toBe('四卒平4');
  });
});

describe('final legal move service', () => {
  test('filters pinned moves while retaining moves that resolve the check', () => {
    const board = emptyBoard();
    board[9][4] = piece('K');
    board[8][4] = piece('R');
    board[0][4] = piece('r');
    expect(getLegalMovesFrom(board, 4, 8, true)).not.toContainEqual([3, 8]);
    expect(getLegalMovesFrom(board, 4, 8, true)).toContainEqual([4, 7]);
  });

  test('detects check, flying generals, and no-legal-move positions with side-in-check semantics', () => {
    const board = emptyBoard();
    board[9][4] = piece('K');
    board[0][4] = piece('k');
    expect(areKingsFacing(board)).toBe(true);
    expect(isSideInCheck(board, true)).toBe(true);
    expect(isSideInCheck(board, false)).toBe(true);
    expect(hasLegalMove(board, true)).toBe(true);

    const checked = applyMove(board, 4, 9, 3, 9);
    expect(areKingsFacing(checked)).toBe(false);
    expect(isSideInCheck(checked, true)).toBe(false);
    expect(hasLegalMove(new FEN('3k5/4P4/9/9/9/9/9/9/9/4K4 b').getChessArray(), false)).toBe(false);
  });
});
