import { BasePiece, GetChineseMovementNameForSimpleChess } from "./BaseChess";
/**
 * 仕 or 士
 */
export class Advisor extends BasePiece {
  GetChineseMovementName(
    x: number,
    y: number,
    newX: number,
    newY: number,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    board: ReadonlyArray<ReadonlyArray<number>>
  ): string {
    return GetChineseMovementNameForSimpleChess(
      x,
      y,
      newX,
      newY,
      this.IsRed(),
      this.GetName()
    );
  }
  GetName(): string {
    return this.isRed ? "仕" : "士";
  }
  GetCode(): string {
    return this.isRed ? "A" : "a";
  }
  GetAvailableMovement(
    x: number,
    y: number,
    board: ReadonlyArray<ReadonlyArray<number>>,
    ChessArray: ReadonlyArray<BasePiece>
  ): [number, number][] {
    const movements: [number, number][] = [];
    if (this.isRed) {
      if (
        (x === 3 && y === 9) ||
        (x === 5 && y === 9) ||
        (x === 3 && y === 7) ||
        (x === 5 && y === 7)
      ) {
        if (board[8][4] === 0 || !ChessArray[board[8][4] - 1].IsRed()) {
          movements.push([4, 8]);
        }
      }
      if (x === 4 && y === 8) {
        if (board[9][3] === 0 || !ChessArray[board[9][3] - 1].IsRed()) {
          movements.push([3, 9]);
        }
        if (board[9][5] === 0 || !ChessArray[board[9][5] - 1].IsRed()) {
          movements.push([5, 9]);
        }
        if (board[7][3] === 0 || !ChessArray[board[7][3] - 1].IsRed()) {
          movements.push([3, 7]);
        }
        if (board[5][7] === 0 || !ChessArray[board[5][7] - 1].IsRed()) {
          movements.push([5, 7]);
        }
      }
    }
    else{
      if (
        (x === 3 && y === 0) ||
        (x === 5 && y === 0) ||
        (x === 3 && y === 2) ||
        (x === 5 && y === 2)
      ) {
        if (board[1][4] === 0 || ChessArray[board[1][4] - 1].IsRed()) {
          movements.push([4, 1]);
        }
      }
      if (x === 4 && y === 1) {
        if (board[0][3] === 0 || ChessArray[board[0][3] - 1].IsRed()) {
          movements.push([3, 0]);
        }
        if (board[0][5] === 0 || ChessArray[board[0][5] - 1].IsRed()) {
          movements.push([5, 0]);
        }
        if (board[2][3] === 0 || ChessArray[board[2][3] - 1].IsRed()) {
          movements.push([3, 2]);
        }
        if (board[2][5] === 0 || ChessArray[board[2][5] - 1].IsRed()) {
          movements.push([5, 2]);
        }
      }
    }
    return movements;
  }
}
