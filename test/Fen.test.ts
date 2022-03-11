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

test("Test Checking & Checkmate", () => {
  //重炮杀
  const fen1 = new FEN("rnbakabnr/9/1c5c1/p1p3p1p/4C4/4C4/P1P1P1P1P/9/9/RNBAKABNR b");
  expect(fen1.isChecking(true)).toBe(true)
  expect(fen1.isChecking(false)).toBe(false)
  expect(fen1.isCheckmate(true)).toBe(true)

  //黑方困毙
  const fen2 = new FEN("3k5/4P4/9/9/9/9/9/9/9/4K4 b");
  expect(fen2.isChecking(true)).toBe(false)
  expect(fen2.isChecking(false)).toBe(false)
  expect(fen2.isCheckmate(true)).toBe(true)

  //白脸将
  const fen3 = new FEN("3k5/9/9/9/9/9/9/3R5/4K4/9 b");
  expect(fen3.isChecking(true)).toBe(true)
  expect(fen3.isChecking(false)).toBe(false)
  expect(fen3.isCheckmate(true)).toBe(true)

  //白脸将
  let fen4 = new FEN("3k5/9/9/9/9/9/9/3R5/4K4/9 b");
  expect(fen4.isChecking(true)).toBe(true)
  expect(fen4.isChecking(false)).toBe(false)
  expect(fen4.isCheckmate(true)).toBe(true)

  //马后炮
  fen4 = new FEN("5k3/4a4/4bN3/9/9/5C3/9/9/4K4/9 b");
  expect(fen4.isChecking(true)).toBe(true)
  expect(fen4.isChecking(false)).toBe(false)
  expect(fen4.isCheckmate(true)).toBe(true)

  fen4 = new FEN("3aka3/9/9/9/9/9/9/9/9/3AKA3 b");
  expect(fen4.isKingFacing()).toBe(true)

  //困毙
  fen4 = new FEN("3aka3/4n4/9/9/9/9/9/9/9/3AKA3 b");
  expect(fen4.isChecking(true)).toBe(false)
  expect(fen4.isCheckmate(true)).toBe(true)

  //
  fen4 = new FEN("2bakab2/9/4c4/N3R3p/9/P2pc4/9/4C3B/4A4/2rK1A3 w");
  expect(fen4.isChecking(false)).toBe(true)
  expect(fen4.isCheckmate(false)).toBe(false)
  //rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR w - - 0 1 moves h2e2 b9c7 h0g2 h7f7 i0h0 h9g7 b2c2 i9h9 h0h9 g7h9 b0a2 g6g5 a0b0 a9b9 b0b5 g9e7 c2c6 f7g7 g0i2 g7g3 c3c4 h9g7 c4c5 b7a7 a2c3 g3c3 b5b9 c3c6 b9b3 c6c0 d0e1 e7c5 b3c3 c0b0 c3c5 a7a3 e2a2 g7e8 g2f4 b0b2 i3i4 a3a5 f4g6 b2e2 e0d0 e2b2 g6h8 b2b7 c5b5 e8d6 b5b6 a5f5 b6d6 f5f6 d6d3 f9e8 h8i6 f6h6 i6h4 h6h5 a2e2 c7d5 e2e6 e9f9 d3b3 b7d7 d0e0 d7e7 i4i5 e7e3 e1d2 h5h7 h4f5 h7e7 i5h5 a6a5 h5g5 a5a4 f5e3 a4b4 b3d3 d5e3 f0e1 f9f8 i2g0 f8f9 g5g6 f9f8 g6g7 b4c4 g0e2 f8f9 e6d6 e7e2 e0d0 e3g4 d3f3 f9e9 f3f4 g4i3 d6e6 e8f9 f4c4 i3g2 c4c9 g2f4 e6e4 f4h5 g7f7 h5f6 e4e6 f6h7 e6e3 h7g5 f7f8 g5h7 c9c8 h7f8 c8f8 e2i2 d0e0 i2i7 e0f0 i7c7 f8f9 e9e8 f9d9 c7g7 d9d7 g7g9 e3c3 g9g3 c3c0 g3e3 d7d6 e3e7 d6e6 e8d8 e6e7 d8d9 e7e8
})
