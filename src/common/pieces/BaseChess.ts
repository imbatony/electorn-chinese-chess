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
    board: ReadonlyArray<ReadonlyArray<number>>,
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
export const MovementNameArray: ReadonlyArray<string> = [
  "一",
  "二",
  "三",
  "四",
  "五",
  "六",
  "七",
  "八",
  "九",
];
export const GetChineseMovementNameForSimpleChess = (
  x: number,
  y: number,
  newX: number,
  newY: number,
  isRed: boolean,
  chessName: string
): string => {
  let actionName;
  const direction = isRed ? -1 : 1;
  let positionTo = "";
  let positionFrom = "" + (x + 1);
  if (newY != x) {
    actionName = (newY - y) * direction > 0 ? "进" : "退";
    const move = Math.abs(newY - y);
    positionTo = "" + move;
    if (isRed) {
      positionTo = MovementNameArray[move - 1];
      positionFrom = MovementNameArray[8 - x];
    }
  } else if (newX != x) {
    actionName = "平";
    if (isRed) {
      positionTo = MovementNameArray[newX];
      positionFrom = MovementNameArray[8 - x];
    }
  }
  return `${chessName}${positionFrom}${actionName}${positionTo}`;
};
