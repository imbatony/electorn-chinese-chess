import { FEN } from "../src/common/Fen";
import { PieceArray } from "../src/common/Pieces";

test("Test Fen", () => {
  const fen = new FEN();
  expect(fen.getFen()).toBe(
    "rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR w"
  );
  // fen.printBoard();
  expect(fen.isRedTurn()).toBeTruthy();
  const array = fen.getChessArray();
  expect(PieceArray[array[0][0] - 1].GetName()).toBe("车");
  expect(PieceArray[array[0][1] - 1].GetName()).toBe("马");
  expect(PieceArray[array[0][2] - 1].GetName()).toBe("象");
  expect(PieceArray[array[0][3] - 1].GetName()).toBe("士");
  expect(PieceArray[array[0][4] - 1].GetName()).toBe("将");
  expect(PieceArray[array[0][5] - 1].GetName()).toBe("士");
  expect(PieceArray[array[0][6] - 1].GetName()).toBe("象");
  expect(PieceArray[array[0][7] - 1].GetName()).toBe("马");
  expect(PieceArray[array[0][8] - 1].GetName()).toBe("车");
  expect(array[1][0]).toBe(0);
  expect(array[2][0]).toBe(0);
  expect(PieceArray[array[2][1] - 1].GetName()).toBe("炮");
  expect(PieceArray[array[2][7] - 1].GetName()).toBe("炮");
  expect(PieceArray[array[3][0] - 1].GetName()).toBe("卒");
  expect(PieceArray[array[3][2] - 1].GetName()).toBe("卒");
  expect(PieceArray[array[3][4] - 1].GetName()).toBe("卒");
  expect(PieceArray[array[3][6] - 1].GetName()).toBe("卒");
  expect(PieceArray[array[3][8] - 1].GetName()).toBe("卒");

  expect(PieceArray[array[9][0] - 1].GetName()).toBe("车");
  expect(PieceArray[array[9][1] - 1].GetName()).toBe("马");
  expect(PieceArray[array[9][2] - 1].GetName()).toBe("相");
  expect(PieceArray[array[9][3] - 1].GetName()).toBe("仕");
  expect(PieceArray[array[9][4] - 1].GetName()).toBe("帅");
  expect(PieceArray[array[9][5] - 1].GetName()).toBe("仕");
  expect(PieceArray[array[9][6] - 1].GetName()).toBe("相");
  expect(PieceArray[array[9][7] - 1].GetName()).toBe("马");
  expect(PieceArray[array[9][8] - 1].GetName()).toBe("车");
});

test("Test UpdateFen", () => {
  const oldfen = new FEN();
  //帅五进一
  const fen = FEN.UpdateFen(oldfen, 4, 9, 4, 8);
  expect(fen.getFen()).toBe(
    "rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/4K4/RNBA1ABNR b"
  );
  expect(fen.isRedTurn()).toBeFalsy();
  const array = fen.getChessArray();
  expect(PieceArray[array[0][0] - 1].GetName()).toBe("车");
  expect(PieceArray[array[0][1] - 1].GetName()).toBe("马");
  expect(PieceArray[array[0][2] - 1].GetName()).toBe("象");
  expect(PieceArray[array[0][3] - 1].GetName()).toBe("士");
  expect(PieceArray[array[0][4] - 1].GetName()).toBe("将");
  expect(PieceArray[array[0][5] - 1].GetName()).toBe("士");
  expect(PieceArray[array[0][6] - 1].GetName()).toBe("象");
  expect(PieceArray[array[0][7] - 1].GetName()).toBe("马");
  expect(PieceArray[array[0][8] - 1].GetName()).toBe("车");
  expect(array[1][0]).toBe(0);
  expect(array[2][0]).toBe(0);
  expect(PieceArray[array[2][1] - 1].GetName()).toBe("炮");
  expect(PieceArray[array[2][7] - 1].GetName()).toBe("炮");
  expect(PieceArray[array[3][0] - 1].GetName()).toBe("卒");
  expect(PieceArray[array[3][2] - 1].GetName()).toBe("卒");
  expect(PieceArray[array[3][4] - 1].GetName()).toBe("卒");
  expect(PieceArray[array[3][6] - 1].GetName()).toBe("卒");
  expect(PieceArray[array[3][8] - 1].GetName()).toBe("卒");

  expect(PieceArray[array[8][4] - 1].GetName()).toBe("帅");

  expect(PieceArray[array[9][0] - 1].GetName()).toBe("车");
  expect(PieceArray[array[9][1] - 1].GetName()).toBe("马");
  expect(PieceArray[array[9][2] - 1].GetName()).toBe("相");
  expect(PieceArray[array[9][3] - 1].GetName()).toBe("仕");
  expect(PieceArray[array[9][5] - 1].GetName()).toBe("仕");
  expect(PieceArray[array[9][6] - 1].GetName()).toBe("相");
  expect(PieceArray[array[9][7] - 1].GetName()).toBe("马");
  expect(PieceArray[array[9][8] - 1].GetName()).toBe("车");
});


test("Test UpdateFen", () => {
  const oldfen = new FEN("rnbakabnr/9/4c2c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR b");
  //炮５进４ 吃子
  const fen = FEN.UpdateFen(oldfen, 4, 2, 4, 6);
  expect(fen.getFen()).toBe(
    "rnbakabnr/9/7c1/p1p1p1p1p/9/9/P1P1c1P1P/1C5C1/9/RNBAKABNR r"
  );
});
