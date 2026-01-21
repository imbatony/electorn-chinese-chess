import { Advisor } from './pieces/Advisor';
import { BasePiece } from './pieces/BaseChess';
import { Bishop } from './pieces/Bishop';
import { Cannon } from './pieces/Cannon';
import { King } from './pieces/King';
import { Knight } from './pieces/Knight';
import { Pawn } from './pieces/Pawn';
import { Rook } from './pieces/Rook';

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

const PieceIndexMap: ReadonlyMap<string, number> = new Map<string, number>(
  PieceArray.map((e, i) => [e.GetCode(), i + 1])
);
export { Advisor, Bishop, Cannon, King, Knight, Pawn, PieceArray, PieceIndexMap, Rook };
