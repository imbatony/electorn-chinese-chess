import { BasePiece, GetChineseMovementNameForSimpleChess } from "./BaseChess";

/**
 * 象 or 相
 */
export class Bishop extends BasePiece {
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
    return this.isRed ? "相" : "象";
  }
  GetCode(): string {
    return this.isRed ? "B" : "b";
  }
  GetAvailableMovement(
    x: number,
    y: number,
    board: ReadonlyArray<ReadonlyArray<number>>,
    ChessArray: ReadonlyArray<BasePiece>
  ): [number, number][] {
    let movements: [number, number][] = [];
    let gapYU = 9;
    let gapYD = 5;
    if(!this.isRed){
      gapYU = 4;
      gapYD = 0;
    }
    //3点钟方向
    movements.push([x + 2, y - 2]);
    //9点钟方向
    movements.push([x + 2, y + 2]);
    //15点钟方向
    movements.push([x - 2, y + 2]);
    //21点钟方向
    movements.push([x - 2, y - 2]);
    movements = movements.filter(([tx, ty]) => {
      if (
        tx <= 8 &&
        tx >= 0 &&
        ty >= gapYD &&
        ty <= gapYU &&
        (board[ty][tx] === 0 ||
          ChessArray[board[ty][tx] - 1].IsRed() != this.isRed)
      ) {
        const blockX = (tx + x) / 2;
        const blockY = (ty + y) / 2;
        return board[blockY][blockX] === 0;
      }
      return false;
    });
    return movements;
  }
}
