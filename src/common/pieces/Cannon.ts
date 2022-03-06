import { BasePiece } from "./BaseChess";

/**
 * 炮
 */
export class Cannon extends BasePiece {
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
    return "炮";
  }
  GetCode(): string {
    return this.isRed ? "C" : "c";
  }
  GetAvailableMovement(
    x: number,
    y: number,
    board: ReadonlyArray<ReadonlyArray<number>>,
    ChessArray: ReadonlyArray<BasePiece>
  ): [number, number][] {
    const movements: [number, number][] = [];

    //上
    let block = false;
    for (let i = y - 1; i >= 0; i--) {
      if (!block) {
        if (board[i][x] === 0) {
          movements.push([x, i]);
        } else {
          block = true;
        }
      } else {
        if (board[i][x] === 0) {
          continue;
        } else if (ChessArray[board[i][x] - 1].IsRed() != this.isRed) {
          movements.push([x, i]);
          break;
        } else {
          break;
        }
      }
    }
    //下
    block = false;
    for (let i = y + 1; i <= 9; i++) {
      if (!block) {
        if (board[i][x] === 0) {
          movements.push([x, i]);
        } else {
          block = true;
        }
      } else {
        if (board[i][x] === 0) {
          continue;
        } else if (ChessArray[board[i][x] - 1].IsRed() != this.isRed) {
          movements.push([x, i]);
          break;
        } else {
          break;
        }
      }
    }
    //左
    block = false;
    for (let i = x - 1; i >= 0; i--) {
      if (!block) {
        if (board[y][i] === 0) {
          movements.push([i, y]);
        } else {
          block = true;
        }
      } else {
        if (board[y][i] === 0) {
          continue;
        } else if (ChessArray[board[y][i] - 1].IsRed() != this.isRed) {
          movements.push([i, y]);
          break;
        } else {
          break;
        }
      }
    }
    //右
    for (let i = x + 1; i <= 8; i++) {
      if (!block) {
        if (board[y][i] === 0) {
          movements.push([i, y]);
        } else {
          block = true;
        }
      } else {
        if (board[y][i] === 0) {
          continue;
        } else if (ChessArray[board[y][i] - 1].IsRed() != this.isRed) {
          movements.push([i, y]);
          break;
        } else {
          break;
        }
      }
    }
    return movements;
  }
}
