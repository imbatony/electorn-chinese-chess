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
    console.log(
      `UpdateFen from:${fen.fenstr} to:${newFen} movement:x->${x},y->${y},tx->${tx},ty->${ty}`
    );
    let newMove = PointsToICCS(x, y, tx, ty);
    if (fen.moves !== "") {
      newMove = fen.moves + " " + newMove;
    }
    return new FEN(newFen, arrClone, newMove, fen.fenInit);
  }

  constructor(
    str?: string,
    arr?: Array<Array<number>>,
    moves?: string,
    initFen?: string
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

  getFenWithMove(): string {
    if (this.moves) {
      return `${this.fenInit} - - 0 1 moves ${
        this.moves
      }`;
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
