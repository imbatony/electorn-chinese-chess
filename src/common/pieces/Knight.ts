import { BasePiece } from "./BaseChess";

/**
 * 马
 */
export class Knight extends BasePiece {
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
    return "马";
  }
  GetCode(): string {
    return this.isRed ? "N" : "n";
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

    //1点钟方向
    movements.push([x + 1, y - 2]);
    //5点钟方向
    movements.push([x + 2, y - 1]);
    //7点钟方向
    movements.push([x + 2, y + 1]);
    //11点钟方向
    movements.push([x + 1, y + 2]);

    //23点钟方向
    movements.push([x - 1, y - 2]);
    //19点钟方向
    movements.push([x - 2, y - 1]);
    //17点钟方向
    movements.push([x - 2, y + 1]);
    //13点钟方向
    movements.push([x - 1, y + 2]);

    movements = movements.filter(([tx, ty]) => {
      if (
        tx <= 8 &&
        tx >= 0 &&
        ty >= 0 &&
        ty <= 9 &&
        (board[ty][tx] === 0 ||
          ChessArray[board[ty][tx] - 1].IsRed() != this.isRed)
      ) {
        let blockX = x;
        let blockY = y;
        if (Math.abs(tx - x) == 2) {
          blockX = (tx + x) / 2;
        } else {
          blockY = (ty + y) / 2;
        }
        return board[blockY][blockX] === 0;
      }
      return false;
    });
    return movements;
  }
}
