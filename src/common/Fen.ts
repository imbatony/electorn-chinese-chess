import { PieceIndexMap, PieceArray } from "./Pieces";
import { PointsToICCS } from "./ICCS";
import * as _ from "lodash";

const defaultFenInit =
  "rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR w";
/**
 * https://www.xqbase.com/protocol/cchess_fen.htm
 */
export class FEN {
  /**
   * 当前fen码
   */
  private fenstr: string;
  /**
   * 初始fen码
   */
  private fenInit: string;

  /**
   * 盘面是否合法
   */
  private valid: boolean;
  /**
   * 红方走棋：true 黑方走棋：false
   */
  private turn: boolean;

  private lastMove: [number, number, number, number];

  private moves: string;
  /**
   * 盘面数组
   */
  private arr: Array<Array<number>>;

  /**
   * 检测fen码
   * @param s
   * @returns
   */
  public static verifyFEN(s: string): boolean {
    s = s.replace(/[\r\n]/, "");
    s = s.replace(/%20/g, " ");
    s = s.replace(/\+/g, " ");
    s = s.replace(/ b.*/, " b");
    s = s.replace(/ w.*/, " w");
    s = s.replace(/ r.*/, " w");

    let a = [];
    let sum = 0;
    let w = new String(s.substr(s.length - 2, 2));
    w = w.toLowerCase();
    if (w != " w" && w != " b") {
      return false;
    }
    s = s.substr(0, s.length - 2);
    a = String(s).split(/\//);
    if (a.length != 10) {
      return false;
    }
    for (let x = 0; x < 10; x++) {
      sum = 0;
      if (String(a[x]).search(/[^1-9kabnrcpKABNRCP]/) != -1) {
        return false;
      }
      a[x] = String(a[x]).replace(/[kabnrcpKABNRCP]/g, "1");
      while (String(a[x]).length != 0) {
        sum = sum + Number(String(a[x]).charAt(0));
        a[x] = String(a[x]).substr(1);
      }
      if (sum != 9) {
        return false;
      }
    }
    return true;
  }

  public static UpdateFen(
    fen: FEN,
    x: number,
    y: number,
    tx: number,
    ty: number
  ): FEN {
    const arr = fen.arr;
    const arrClone = _.cloneDeep(arr);
    arrClone[y][x] = 0;
    arrClone[ty][tx] = arr[y][x];

    let newFen = arrClone
      .map((l) => {
        let line = "";
        let number = 0;
        for (let i = 0; i <= 8; i++) {
          if (l[i] === 0) {
            number++;
          } else {
            if (number !== 0) {
              line += "" + number;
              number = 0;
            }
            line += PieceArray[l[i] - 1].GetCode();
          }
        }
        if (number !== 0) {
          line += "" + number;
        }
        return line;
      })
      .join("/");
    newFen += " " + (fen.isRedTurn() ? "b" : "r");
    // console.log(
    //   `UpdateFen from:${fen.fenstr} to:${newFen} movement:x->${x},y->${y},tx->${tx},ty->${ty}`
    // );
    let newMove = PointsToICCS(x, y, tx, ty);
    if (fen.moves !== "") {
      newMove = fen.moves + " " + newMove;
    }
    return new FEN(newFen, arrClone, newMove, fen.fenInit, [x, y, tx, ty]);
  }

  constructor(
    str?: string,
    arr?: Array<Array<number>>,
    moves?: string,
    initFen?: string,
    lastMove?: [number, number, number, number]
  ) {
    if (str) {
      if (FEN.verifyFEN(str)) {
        this.fenstr = str;
      } else {
        console.error("fen is invalid", str);
        this.fenstr = str;
        this.valid = false;
      }
    } else {
      this.fenstr = defaultFenInit;
    }
    this.valid = true;
    if (lastMove) {
      this.lastMove = lastMove;
    } else {
      this.lastMove = [-1, -1, -1, -1];
    }

    if (initFen) {
      this.fenInit = initFen;
    } else {
      this.fenInit = defaultFenInit;
    }
    if (moves) {
      this.moves = moves;
    } else {
      this.moves = "";
    }
    const fenSplit = this.fenstr.split(" ");
    const fenArray = fenSplit[0].split("/");
    this.turn = fenSplit[1] !== "b";
    if (arr) {
      this.arr = arr;
      return;
    }
    this.arr = [];
    for (let i = 0; i <= 9; i++) {
      const line = fenArray[i];
      const lineArray: Array<number> = [];
      for (let j = 0; j < line.length; j++) {
        const code = line.charAt(j);
        if (code >= "0" && code <= "9") {
          let zeros = parseInt(code);
          while (zeros-- > 0) {
            lineArray.push(0);
          }
        } else {
          lineArray.push(PieceIndexMap.get(code));
        }
      }
      this.arr.push(lineArray);
    }
  }

  getFen(): string {
    return this.fenstr;
  }
  getLastMove(): [number, number, number, number] {
    return this.lastMove;
  }

  getFenWithMove(): string {
    if (this.moves) {
      return `${this.fenInit} - - 0 1 moves ${this.moves}`;
    } else {
      return `${this.fenInit} - - 0 1`;
    }
  }

  isRedTurn(): boolean {
    return this.turn;
  }

  isValid(): boolean {
    return this.valid;
  }

  getChessArray(): ReadonlyArray<ReadonlyArray<number>> {
    return this.arr;
  }

  /**
   * 是否某方将军
   */
  isChecking(isRed = this.isRedTurn()): boolean {
    let [kingPostionX, kingPostionY] = [0, 0];
    for (let i = 0; i <= 8; i++) {
      for (let j = 0; j <= 9; j++) {
        if (this.arr[j][i] != 0) {
          const piece = PieceArray[this.arr[j][i] - 1];
          if (
            piece.IsRed() !== isRed &&
            piece.GetCode().toLowerCase() === "k"
          ) {
            [kingPostionX, kingPostionY] = [i, j];
          }
        }
      }
    }

    for (let i = 0; i <= 8; i++) {
      for (let j = 0; j <= 9; j++) {
        if (this.arr[j][i] != 0) {
          const piece = PieceArray[this.arr[j][i] - 1];
          if (piece.IsRed() === isRed && piece.CanCheck()) {
            const checkMovement = piece
              .GetAvailableMovement(i, j, this.arr, PieceArray)
              .filter(
                ([x, y]) => x === kingPostionX && y === kingPostionY
              ).length;
            if (checkMovement > 0) {
              return true;
            }
          }
        }
      }
    }
    return false;
  }

  isKingFacing(): boolean {
    for (let i = 0; i <= 8; i++) {
      for (let j = 0; j <= 9; j++) {
        if (this.arr[j][i] !== 0) {
          const piece = PieceArray[this.arr[j][i] - 1];
          if (piece.GetCode() === "k") {
            for (let k = j + 1; k <= 9; k++) {
              if (this.arr[k][i] !== 0) {
                const p = PieceArray[this.arr[k][i] - 1];
                if (p.GetCode() === "K") {
                  return true;
                } else {
                  return false;
                }
              }
            }
          } else {
            continue;
          }
        }
      }
    }
    return false;
  }

  /**
   * 是否某方将死对方
   * 实现逻辑：穷举对方所有可行动作，将会导致被将军或者困毙
   * @param isRed
   */
  isCheckmate(isRed = this.isRedTurn()): boolean {
    //遍历对方可移动的盘面，是否走了以后没有被将，则说明没将死
    for (let i = 0; i <= 8; i++) {
      for (let j = 0; j <= 9; j++) {
        if (this.arr[j][i] != 0) {
          const piece = PieceArray[this.arr[j][i] - 1];
          if (piece.IsRed() !== isRed) {
            const movements = piece.GetAvailableMovement(
              i,
              j,
              this.arr,
              PieceArray
            );
            if (movements.length > 0) {
              for (const [tx, ty] of movements) {
                const nextFen = FEN.UpdateFen(this, i, j, tx, ty);
                const noChecking = !nextFen.isChecking(isRed);
                const noFacing = !nextFen.isKingFacing();
                if (noChecking && noFacing) {
                  console.log(
                    "existing move[",
                    i,
                    ",",
                    j,
                    "]->[",
                    tx,
                    ",",
                    ty,
                    "],noChecking:",
                    noChecking
                  );
                  return false;
                }
              }
            }
          }
        }
      }
    }
    //
    return true;
  }

  printBoard(): void {
    for (const e of this.arr) {
      let line = "";
      for (const f of e) {
        if (f > 0) {
          line += PieceArray[f - 1].GetName();
        } else {
          line += " ";
        }
      }
      console.log(line);
    }
  }
}
