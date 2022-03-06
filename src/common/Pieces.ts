import { Advisor } from "./pieces/Advisor";
import { King } from "./pieces/King";
import { Bishop } from "./pieces/Bishop";
import { BasePiece } from "./pieces/BaseChess";
import { Knight } from "./pieces/Knight";
import { Rook } from "./pieces/Rook";
import { Pawn } from "./pieces/Pawn";
import { Cannon } from "./pieces/Cannon";

const PieceArray: ReadonlyArray<BasePiece> = [
  new King(true),
  new Advisor(true),
  new Bishop(true),
  new Knight(true),
  new Rook(true),
  new Cannon(true),
  new Pawn(true),
  new King(false),
  new Advisor(false),
  new Bishop(false),
  new Knight(false),
  new Rook(false),
  new Cannon(false),
  new Pawn(false),
];

const PieceCodeMap: ReadonlyMap<string, BasePiece> = new Map<string, BasePiece>(
  PieceArray.map((e) => [e.GetCode(), e])
);

const PieceIndexMap: ReadonlyMap<string, number> = new Map<string, number>(
  PieceArray.map((e, i) => [e.GetCode(), i + 1])
);
export {
  BasePiece,
  PieceArray ,
  PieceCodeMap ,
  PieceIndexMap,
  Advisor,
  King,
  Bishop,
  Knight,
  Rook,
  Pawn,
  Cannon,
};
