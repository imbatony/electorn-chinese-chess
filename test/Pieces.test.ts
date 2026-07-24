import { FEN } from "../src/common/Fen";
import {
  Advisor,
  Bishop,
  Cannon,
  King,
  Knight,
  Pawn,
  PieceArray,
  Rook,
} from "../src/common/Pieces";
import { GetChineseMovementNameForSimpleChess } from "../src/common/pieces/BaseChess";

test("Test King", () => {
  const red = new King(true);
  const black = new King(false);
  //red
  expect(red.GetName()).toBe("帅");
  expect(red.GetCode()).toBe("K");
  //black
  expect(black.GetName()).toBe("将");
  expect(black.GetCode()).toBe("k");

  let fen = new FEN("4k4/9/9/9/9/9/9/9/9/5K3 w - - 0 1");
  let board = fen.getChessArray();
  expect(red.GetChineseMovementName(5, 9, 5, 8, board)).toBe(
    "帅四进一"
  );
  expect(black.GetChineseMovementName(4, 0, 4, 1, board)).toBe(
    "将5进1"
  );
  let m = red.GetAvailableMovement(5, 9, board, PieceArray);
  expect(m.length).toBe(1)
  expect(m).toContainEqual([5, 8]);
  m = black.GetAvailableMovement(4, 0, board, PieceArray);
  expect(m.length).toBe(2)
  expect(m).toContainEqual([4, 1]);
  expect(m).toContainEqual([3, 0]);
  
  fen = new FEN("3k5/9/9/9/9/9/9/3A5/9/4K4 w");
  board = fen.getChessArray();
  m = red.GetAvailableMovement(4,9,board,PieceArray);
  expect(m.length).toBe(3)
  expect(m).toContainEqual([4, 8]);
  expect(m).toContainEqual([5, 9]);
  expect(m).toContainEqual([3, 9]);

  fen = new FEN("3k5/9/9/9/9/9/9/9/4A4/3CK4 w");
  board = fen.getChessArray();
  m = red.GetAvailableMovement(4,9,board,PieceArray);
  expect(m.length).toBe(1)
  expect(m).toContainEqual([5, 9]);

  fen = new FEN("3k5/9/9/9/9/9/9/3C5/4A4/4K4 w");
  board = fen.getChessArray();
  m = red.GetAvailableMovement(4,9,board,PieceArray);
  expect(m.length).toBe(2)
  expect(m).toContainEqual([5, 9]);
  expect(m).toContainEqual([3, 9]);
});

test("Test Advisor", () => {
  const red = new Advisor(true);
  const black = new Advisor(false);
  //red
  expect(red.GetName()).toBe("仕");
  expect(red.GetCode()).toBe("A");
  //black
  expect(black.GetName()).toBe("士");
  expect(black.GetCode()).toBe("a");
});

describe.each([
  { name: "red", piece: new Advisor(true), center: [4, 8] as const, targets: [[3, 9], [5, 9], [3, 7], [5, 7]] as [number, number][], own: "A", enemy: "a" },
  { name: "black", piece: new Advisor(false), center: [4, 1] as const, targets: [[3, 0], [5, 0], [3, 2], [5, 2]] as [number, number][], own: "a", enemy: "A" },
])("$name advisor movement", ({ piece, center, targets, own, enemy }) => {
  const ownIndex = PieceArray.findIndex((candidate) => candidate.GetCode() === own) + 1;
  const enemyIndex = PieceArray.findIndex((candidate) => candidate.GetCode() === enemy) + 1;

  test("can move in all four directions on an empty palace", () => {
    const board = Array.from({ length: 10 }, () => Array<number>(9).fill(0));
    expect(piece.GetAvailableMovement(center[0], center[1], board, PieceArray)).toEqual(
      expect.arrayContaining(targets)
    );
  });

  test.each(targets.map((target) => [target] as const))(
    "rejects own occupancy and accepts enemy occupancy at %j",
    (target) => {
    const board = Array.from({ length: 10 }, () => Array<number>(9).fill(0));
    board[target[1]][target[0]] = ownIndex;
    expect(piece.GetAvailableMovement(center[0], center[1], board, PieceArray)).not.toContainEqual(target);
    board[target[1]][target[0]] = enemyIndex;
    expect(piece.GetAvailableMovement(center[0], center[1], board, PieceArray)).toContainEqual(target);
    }
  );
});

test("formats simple Chinese movement names", () => {
  expect(GetChineseMovementNameForSimpleChess(4, 9, 4, 8, true, "帅")).toBe("帅五进一");
  expect(GetChineseMovementNameForSimpleChess(4, 0, 4, 2, false, "将")).toBe("将5进2");
  expect(GetChineseMovementNameForSimpleChess(7, 7, 4, 7, true, "车")).toBe("车二平五");
  expect(GetChineseMovementNameForSimpleChess(1, 2, 4, 2, false, "车")).toBe("车2平5");
  expect(GetChineseMovementNameForSimpleChess(4, 8, 3, 7, true, "仕")).toBe("仕五进六");
  expect(GetChineseMovementNameForSimpleChess(4, 1, 5, 2, false, "士")).toBe("士5进6");
});

test("King rejects out-of-bounds source coordinates", () => {
  const king = new King(true);
  const board = new FEN().getChessArray();
  expect(king.GetAvailableMovement(-1, 9, board, PieceArray)).toEqual([]);
  expect(king.GetAvailableMovement(4, 10, board, PieceArray)).toEqual([]);
});
test("Test Bishop", () => {
  const red = new Bishop(true);
  const black = new Bishop(false);
  //red
  expect(red.GetName()).toBe("相");
  expect(red.GetCode()).toBe("B");
  //black
  expect(black.GetName()).toBe("象");
  expect(black.GetCode()).toBe("b");
});

test("Test Knight", () => {
  const red = new Knight(true);
  const black = new Knight(false);
  //red
  expect(red.GetName()).toBe("马");
  expect(red.GetCode()).toBe("N");
  //black
  expect(black.GetName()).toBe("马");
  expect(black.GetCode()).toBe("n");
});

test("Test Rook", () => {
  const red = new Rook(true);
  const black = new Rook(false);
  //red
  expect(red.GetName()).toBe("车");
  expect(red.GetCode()).toBe("R");
  //black
  expect(black.GetName()).toBe("车");
  expect(black.GetCode()).toBe("r");
});

test("Test Cannon", () => {
  const red = new Cannon(true);
  const black = new Cannon(false);
  //red
  expect(red.GetName()).toBe("炮");
  expect(red.GetCode()).toBe("C");
  //black
  expect(black.GetName()).toBe("炮");
  expect(black.GetCode()).toBe("c");
});

test("Test Pawn", () => {
  const red = new Pawn(true);
  const black = new Pawn(false);
  //red
  expect(red.GetName()).toBe("兵");
  expect(red.GetCode()).toBe("P");
  //black
  expect(black.GetName()).toBe("卒");
  expect(black.GetCode()).toBe("p");
});
