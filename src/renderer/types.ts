export interface Position {
  x: number;
  y: number;
}
export enum PlayType {
  CVC,
  PVC,
  PVP,
}

export interface PlaySide {
  red: string;
  black: string;
}
