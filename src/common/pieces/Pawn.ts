import { BasePiece } from "./BaseChess";

/**
 * 兵
 */
export class Pawn extends BasePiece {
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
    return this.isRed ? "兵" : "卒";
  }
  GetCode(): string {
    return this.isRed ? "P" : "p";
  }
  CanCheck():boolean{
    return true;
  }
  GetAvailableMovement(
    x: number,
    y: number,
    board: ReadonlyArray<ReadonlyArray<number>>,
    ChessArray: ReadonlyArray<BasePiece>
  ): [number, number][] {
    let movements: [number, number][] = [];
    let direction = -1;
    if (!this.isRed) {
      direction = 1;
    }
    movements.push([x, y + direction]);
    if (this.isRed && y <= 4 || !this.isRed && y >= 5) {
      movements.push([x - 1, y]);
      movements.push([x + 1, y]);
    } 
    movements = movements.filter(([tx, ty]) => {
      return (
        tx <= 8 &&
        tx >= 0 &&
        ty >= 0 &&
        ty <= 9 &&
        (board[ty][tx] === 0 ||
          ChessArray[board[ty][tx] - 1].IsRed() != this.isRed)
      );
    });
    return movements;
  }
}
