import { BasePiece } from "./BaseChess";

/**
 * 车
 */
export class Rook extends BasePiece {
  GetChineseMovementName(
    x: number,
    y: number,
    newX: number,
    newY: number,
    board: ReadonlyArray<ReadonlyArray<number>>
  ): string {
    throw new Error("Method not implemented.");
  }
  GetName(): string {
    return "车";
  }
  GetCode(): string {
    return this.isRed ? "R" : "r";
  }
  GetAvailableMovement(
    x: number,
    y: number,
    board: ReadonlyArray<ReadonlyArray<number>>,
    ChessArray: ReadonlyArray<BasePiece>
  ): [number, number][] {
    const movements: [number, number][] = [];

    //上
    for (let i = y - 1; i >= 0; i--) {
      if (board[i][x] === 0) {
        movements.push([x, i]);
      } else if (ChessArray[board[i][x] - 1].IsRed() != this.isRed) {
        movements.push([x, i]);
        break;
      } else {
        break;
      }
    }
    //下
    for (let i = y + 1; i <= 9; i++) {
      if (board[i][x] === 0) {
        movements.push([x, i]);
      } else if (ChessArray[board[i][x] - 1].IsRed() != this.isRed) {
        movements.push([x, i]);
        break;
      } else {
        break;
      }
    }
    //左
    for (let i = x - 1; i >= 0; i--) {
      if (board[y][i] === 0) {
        movements.push([i, y]);
      } else if (ChessArray[board[y][i] - 1].IsRed() != this.isRed) {
        movements.push([i, y]);
        break;
      } else {
        break;
      }
    }
    //右
    for (let i = x + 1; i <= 8; i++) {
      if (board[y][i] === 0) {
        movements.push([i, y]);
      } else if (ChessArray[board[y][i] - 1].IsRed() != this.isRed) {
        movements.push([i, y]);
        break;
      } else {
        break;
      }
    }
    return movements;
  }
}
