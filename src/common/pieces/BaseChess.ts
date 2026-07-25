/**
 * https://www.xqbase.com/protocol/cchess_move.htm
红方    黑方	字母    相当于国际象棋中的棋子	数字
帅      将      K       King(王)               1
仕      士      A       Advisor(没可比棋子)     2
相      象      B[1]	Bishop(象)	           3
㐷      马      N[2]	Knight(马)	            4
伡      车      R       Rook(车)	            5
炮	    砲	    C	    Cannon(没有可比较的棋子) 6
兵	    卒	    P	    Pawn(兵)                7
*/
export abstract class BasePiece {
  protected isRed: boolean;
  constructor(isRed: boolean) {
    this.isRed = isRed;
  }
  /**
   * 中式记谱法
   * https://zh.wikipedia.org/wiki/%E8%B1%A1%E6%A3%8B
   * https://www.xqbase.com/protocol/cchess_move.htm
   * 获得移动名称如“车二进三”
   *
   *
棋盘上的坐标是对每个棋手由右至左的9条直线分别为1至9路。红方用汉字（一、二、三……）书写，黑方用阿拉伯数字（1、2、3）书写 中式记谱法一般使用四个字来记录棋子的移动。
第1字是棋子的名称。如“马”或“车”。
第2字是表示棋子所在直线（路）位置的数字。红方用中国数字，黑方用阿拉伯数字。
当一方有2个以上名称相同的棋子位于同一纵线时，需要用“前”或“后”来加以区别。例如，“前㐷退六”（表示前面的红㐷退到直线六）、“后炮平4”（表示后面的黑炮平移到直线4）。士象不需要以前后来判断，因为纵使是在同一直线上，也可以凭第三个字（进退）知道是移动哪一只。
当兵卒在同一纵线达到3个，用前、中、后来区分，达到4个，用前、二、三、四（或后）区分，达到5个，用前、二、三、四、五（或后）区分。
当兵卒在两个纵线都达到两个以上时，按照旧的记谱方式举例：前兵九平八，此时可省略兵（卒），记做前九平八，以达到都用4个汉字记谱的要求，此表示方式已在中国象棋DhtmlXQ动态棋盘上实现，是对中文记谱方法的一个重要完善。
第3字表示棋子移动的方向：横走用“平”、向前走用“进”、向后走用“退”。有时也可以用“上”、“下”代替“进”、“退”。
第4字是表示棋子前往的目的地。
如果是只能直行或横行的棋子，在直行时表示步数，横行时表示目的地直线（路）位置的数字。[c 5]
如果是只能斜行的棋子，表示目的地直线（路）位置的数字。[c 6]
当棋子只能直行进退一步时可省略。[c 7]
如果记谱只包括中局或残局部分，一开始就轮到黑方走子，那么红方的步数会标上省略号。以下是一个比较完整的例子，记载中炮屏风马对三步虎的头3步：
 
步数	红方	黑方
1.	炮二平五	马8进7
2.	㐷二进三	炮8平9
3.	㐷八进七	车9平8
（“炮二平五”表示红炮从二路平移到五路；“马8进7”表示黑马从8路向前走到7路。）
 
速记法
为了适应形势需要，提高记录速度，有人对原来的中式记谱法记录进行了改革：
 
把数字改为阿拉伯数字；
将四个字改为三个字——去掉第三个字（运动方向），改用短横线。在第三个字下面画一条横线表示“进”，在上面画一条横线表示“退”，不加横线表示“平”。
如：炮{\displaystyle 6{\overline {2}}}6\overline {2}（炮6退2）、车{\displaystyle 72}72（车七平二）、后车{\displaystyle {\underline {2}}}\underline {2}（后车进二）。[27]
   * @param x 当前位置x
   * @param y 当前位置y
   * @param newX 新位置x
   * @param newY 新位置y
   * @param board 盘面二维数组
   */
  abstract GetChineseMovementName(
    x: number,
    y: number,
    newX: number,
    newY: number,
    board: ReadonlyArray<ReadonlyArray<number>>
  ): string;
  /**
   * 获得名称：如车
   */
  abstract GetName(): string;
  /**
   * 获得名称：如车->R
   */
  abstract GetCode(): string;

  CanCheck(): boolean {
    return false;
  }

  /**
   * 是否是红方
   */
  IsRed() {
    return this.isRed;
  }

  /**
   * 获得可以走的移动序列
   * @param x 棋子的x坐标
   * @param y 棋子的y坐标
   * @param board 盘面二维数组
   */
  abstract GetAvailableMovement(
    x: number,
    y: number,
    board: ReadonlyArray<ReadonlyArray<number>>,
    pieceArray: ReadonlyArray<BasePiece>
  ): Array<[number, number]>;
}
const MovementNameArray: ReadonlyArray<string> = [
  '一',
  '二',
  '三',
  '四',
  '五',
  '六',
  '七',
  '八',
  '九',
];
export const GetChineseMovementNameForSimpleChess = (
  x: number,
  y: number,
  newX: number,
  newY: number,
  isRed: boolean,
  chessName: string
): string => {
  const formatNumber = (value: number) => (isRed ? MovementNameArray[value - 1] : `${value}`);
  const positionFrom = formatNumber(isRed ? 9 - x : x + 1);
  let actionName: '进' | '退' | '平';
  let positionTo: string;

  if (newY === y) {
    actionName = '平';
    positionTo = formatNumber(isRed ? 9 - newX : newX + 1);
  } else {
    const direction = isRed ? -1 : 1;
    actionName = (newY - y) * direction > 0 ? '进' : '退';
    positionTo =
      newX === x ? formatNumber(Math.abs(newY - y)) : formatNumber(isRed ? 9 - newX : newX + 1);
  }
  return `${chessName}${positionFrom}${actionName}${positionTo}`;
};

const pieceFamily = (piece: number): number => (piece - 1) % 7;

const frontToBackLabels = (count: number): ReadonlyArray<string> => {
  if (count === 2) {
    return ['前', '后'];
  }
  if (count === 3) {
    return ['前', '中', '后'];
  }
  return MovementNameArray.slice(0, count);
};

const moveSuffix = (
  x: number,
  y: number,
  newX: number,
  newY: number,
  isRed: boolean
): { action: '进' | '退' | '平'; destination: string } => {
  const formatNumber = (value: number) => (isRed ? MovementNameArray[value - 1] : `${value}`);
  const file = (positionX: number) => formatNumber(isRed ? 9 - positionX : positionX + 1);
  if (newY === y) {
    return { action: '平', destination: file(newX) };
  }
  const action = (newY - y) * (isRed ? -1 : 1) > 0 ? '进' : '退';
  return {
    action,
    destination: newX === x ? formatNumber(Math.abs(newY - y)) : file(newX),
  };
};

/**
 * Formats the XQBase four-character notation for pieces which need same-file
 * disambiguation. `board` stores the established PieceArray numeric order.
 */
export const GetChineseMovementNameForPiece = (
  x: number,
  y: number,
  newX: number,
  newY: number,
  isRed: boolean,
  chessName: string,
  board: ReadonlyArray<ReadonlyArray<number>>,
  code: 'n' | 'r' | 'c' | 'p'
): string => {
  const familyByCode = { n: 3, r: 4, c: 5, p: 6 };
  const family = familyByCode[code];
  const samePiece = (piece: number): boolean =>
    piece !== 0 && piece <= 7 === isRed && pieceFamily(piece) === family;
  const formatNumber = (value: number) => (isRed ? MovementNameArray[value - 1] : `${value}`);
  const file = (positionX: number) => formatNumber(isRed ? 9 - positionX : positionX + 1);
  const { action, destination } = moveSuffix(x, y, newX, newY, isRed);
  const sameFile = board
    .map((row, rowY) => ({ rowY, piece: row[x] }))
    .filter(({ piece }) => samePiece(piece))
    .map(({ rowY }) => rowY)
    .sort((left, right) => (isRed ? left - right : right - left));

  if (sameFile.length < 2) {
    return `${chessName}${file(x)}${action}${destination}`;
  }

  const sourceIndex = sameFile.indexOf(y);
  if (sourceIndex < 0) {
    return `${chessName}${file(x)}${action}${destination}`;
  }
  const label = frontToBackLabels(sameFile.length)[sourceIndex];
  if (code !== 'p') {
    return `${label}${chessName}${action}${destination}`;
  }

  const stackedFiles = Array.from({ length: 9 }, (_, fileX) => ({
    fileX,
    rows: board
      .map((row, rowY) => ({ rowY, piece: row[fileX] }))
      .filter(({ piece }) => samePiece(piece))
      .map(({ rowY }) => rowY)
      .sort((left, right) => (isRed ? left - right : right - left)),
  }))
    .filter(({ rows }) => rows.length >= 2)
    .sort((left, right) => (isRed ? right.fileX - left.fileX : left.fileX - right.fileX));

  if (stackedFiles.length < 2) {
    return `${label}${chessName}${action}${destination}`;
  }

  const stackedPawns = stackedFiles.flatMap(({ fileX, rows }) =>
    rows.map((rowY) => ({ fileX, rowY }))
  );
  const globalIndex = stackedPawns.findIndex(({ fileX, rowY }) => fileX === x && rowY === y);
  return `${MovementNameArray[globalIndex]}${chessName}${action}${destination}`;
};
