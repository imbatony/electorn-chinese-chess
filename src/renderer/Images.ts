import bg from "../../assets/img/bg.png";
import r_c from "../../assets/img/r_c.png";
import r_j from "../../assets/img/r_j.png";
import r_m from "../../assets/img/r_m.png";
import r_p from "../../assets/img/r_p.png";
import r_s from "../../assets/img/r_s.png";
import r_x from "../../assets/img/r_x.png";
import r_z from "../../assets/img/r_z.png";
import b_c from "../../assets/img/b_c.png";
import b_j from "../../assets/img/b_j.png";
import b_m from "../../assets/img/b_m.png";
import b_p from "../../assets/img/b_p.png";
import b_s from "../../assets/img/b_s.png";
import b_x from "../../assets/img/b_x.png";
import b_z from "../../assets/img/b_z.png";
import waypoint from "../../assets/img/waypoint.png";
import RedBox from "../../assets/img/r_box.png";
import dot from "../../assets/img/dot.png";

let image = new Image();
image.src = bg;
export const BGImage = image;

const kingImageRed = new Image();
kingImageRed.src = r_j;
const kingImageBlack = new Image();
kingImageBlack.src = b_j;

const AdvisorImageRed = new Image();
AdvisorImageRed.src = r_s;
const AdvisorImageBlack = new Image();
AdvisorImageBlack.src = b_s;

const BishopImageRed = new Image();
BishopImageRed.src = r_x;
const BishopImageBlack = new Image();
BishopImageBlack.src = b_x;

const KnightImageRed = new Image();
KnightImageRed.src = r_m;
const KnightImageBlack = new Image();
KnightImageBlack.src = b_m;

const RookImageRed = new Image();
RookImageRed.src = r_c;
const RookImageBlack = new Image();
RookImageBlack.src = b_c;

const CannonImageRed = new Image();
CannonImageRed.src = r_p;
const CannonImageBlack = new Image();
CannonImageBlack.src = b_p;

const PawnImageRed = new Image();
PawnImageRed.src = r_z;
const PawnImageBlack = new Image();
PawnImageBlack.src = b_z;

export const ChessImageArray: ReadonlyArray<HTMLImageElement> = [
  kingImageRed,
  AdvisorImageRed,
  BishopImageRed,
  KnightImageRed,
  RookImageRed,
  CannonImageRed,
  PawnImageRed,
  kingImageBlack,
  AdvisorImageBlack,
  BishopImageBlack,
  KnightImageBlack,
  RookImageBlack,
  CannonImageBlack,
  PawnImageBlack,
];


image = new Image();
image.src = RedBox;
export const RedBoxImage = image;

image = new Image();
image.src = waypoint;
export const WaypointImage = image;

image = new Image();
image.src = dot;
export const DotImage = image;

export const boardWith = 507;
export const boardHeight = 567;
export const boardOffSetX = 10;
export const boardOffSetY = 10;
export const boardStartPointX = 21;
export const boardStartPointY = 22;
export const spaceX = 57;
export const spaceY = 57;
export const startX = boardOffSetX + boardStartPointX
export const startY = boardOffSetY + boardStartPointY
export const redBoxSize = 54;
export const chessSize = 54;
export const DotImageOffsetX = 13;
export const DotImageOffsetY = 13;
export const waySpaceX = 41;
export const waySpaceY = 41;