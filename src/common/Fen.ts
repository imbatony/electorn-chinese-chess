import { areKingsFacing, hasLegalMove, isSideAttacked } from './BoardRules';
import { PointsToICCS } from './ICCS';
import { PieceArray, PieceIndexMap } from './Pieces';

const defaultFenInit = 'rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR w';
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
    s = s.replace(/[\r\n]/, '');
    s = s.replace(/%20/g, ' ');
    s = s.replace(/\+/g, ' ');
    s = s.replace(/ b.*/, ' b');
    s = s.replace(/ w.*/, ' w');
    s = s.replace(/ r.*/, ' w');

    let a = [];
    let sum = 0;
    let w = new String(s.substr(s.length - 2, 2));
    w = w.toLowerCase();
    if (w != ' w' && w != ' b') {
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
      a[x] = String(a[x]).replace(/[kabnrcpKABNRCP]/g, '1');
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

  public static UpdateFen(fen: FEN, x: number, y: number, tx: number, ty: number): FEN {
    if (!fen.isValid()) {
      throw new Error('Cannot update an invalid FEN');
    }
    for (const [name, value, maximum] of [
      ['x', x, 8],
      ['y', y, 9],
      ['tx', tx, 8],
      ['ty', ty, 9],
    ] as const) {
      if (!Number.isInteger(value) || value < 0 || value > maximum) {
        throw new RangeError(`${name} is outside the chess board`);
      }
    }
    const arr = fen.arr;
    if (arr[y][x] === 0) {
      throw new Error('Cannot move from an empty square');
    }
    const arrClone = [...arr];
    if (y === ty) {
      arrClone[y] = [...arr[y]];
    } else {
      arrClone[y] = [...arr[y]];
      arrClone[ty] = [...arr[ty]];
    }
    arrClone[y][x] = 0;
    arrClone[ty][tx] = arr[y][x];

    let newFen = arrClone
      .map((l) => {
        let line = '';
        let number = 0;
        for (let i = 0; i <= 8; i++) {
          if (l[i] === 0) {
            number++;
          } else {
            if (number !== 0) {
              line += '' + number;
              number = 0;
            }
            line += PieceArray[l[i] - 1].GetCode();
          }
        }
        if (number !== 0) {
          line += '' + number;
        }
        return line;
      })
      .join('/');
    newFen += ' ' + (fen.isRedTurn() ? 'b' : 'r');
    // console.log(
    //   `UpdateFen from:${fen.fenstr} to:${newFen} movement:x->${x},y->${y},tx->${tx},ty->${ty}`
    // );
    let newMove = PointsToICCS(x, y, tx, ty);
    if (fen.moves !== '') {
      newMove = fen.moves + ' ' + newMove;
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
    this.valid = true;
    if (str) {
      if (FEN.verifyFEN(str)) {
        this.fenstr = str;
      } else {
        console.error('fen is invalid', str);
        this.fenstr = str;
        this.valid = false;
      }
    } else {
      this.fenstr = defaultFenInit;
    }
    if (lastMove) {
      this.lastMove = lastMove;
    } else {
      this.lastMove = [-1, -1, -1, -1];
    }

    this.fenInit = initFen ?? this.fenstr;
    if (moves) {
      this.moves = moves;
    } else {
      this.moves = '';
    }
    const fenSplit = this.fenstr.split(' ');
    this.turn = fenSplit[1] !== 'b';
    if (arr) {
      this.arr = arr;
      return;
    }
    if (!this.valid) {
      this.arr = Array.from({ length: 10 }, () => Array<number>(9).fill(0));
      return;
    }
    const fenArray = fenSplit[0].split('/');
    this.arr = [];
    for (let i = 0; i <= 9; i++) {
      const line = fenArray[i];
      const lineArray: Array<number> = [];
      for (let j = 0; j < line.length; j++) {
        const code = line.charAt(j);
        if (code >= '0' && code <= '9') {
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

  /** Returns whether the side identified by this legacy attacker's colour gives check. */
  isChecking(isRed = this.isRedTurn()): boolean {
    return isSideAttacked(this.arr, !isRed);
  }

  isKingFacing(): boolean {
    return areKingsFacing(this.arr);
  }

  /** Returns whether the legacy attacker's opposing side has no legal move. */
  isCheckmate(isRed = this.isRedTurn()): boolean {
    return !hasLegalMove(this.arr, !isRed);
  }

  printBoard(): void {
    for (const e of this.arr) {
      let line = '';
      for (const f of e) {
        if (f > 0) {
          line += PieceArray[f - 1].GetName();
        } else {
          line += ' ';
        }
      }
      console.log(line);
    }
  }
}
