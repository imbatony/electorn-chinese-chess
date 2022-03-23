/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  BoardStatus,
  OP_BACK,
  OP_RESTART,
  OP_ROTATION,
  BoardStatusKey,
  QueryMoveKey,
  BgmKey,
  OP_TOGGLE_BGM,
  APPEXITKey,
  OP_UPDATE_SIDE,
} from "../common/IPCInfos";
import { createContext } from "react";
import { playBgm } from "./Sound";
import { PlaySide } from "./types";
const { ipcRenderer } = window.require("electron");
let onback: () => void;
let onRestart: () => void;
let onRotation: () => void;
let difficulty = 1;
let bgmOn = true;
let mode = "normal";
let bgmType: "welcome" | "board" = "welcome";

const setBgmOn = (bgm: boolean) => {
  bgmOn = bgm;
};
const setMode = (m: string) => {
  mode = m;
};
const setBgmType = (type: "welcome" | "board") => {
  bgmType = type;
  playBgm(bgmOn, bgmType);
  ipcRenderer.send(BgmKey, bgmOn, bgmType);
};
const queryMove = (fenStr: string, turn: boolean) => {
  let dif = difficulty;
  if (mode !== "normal") {
    dif = null;
  }
  return ipcRenderer.invoke(QueryMoveKey, { fenStr, difficulty: dif, turn });
};
ipcRenderer.removeAllListeners(OP_TOGGLE_BGM);
ipcRenderer.on(OP_TOGGLE_BGM, () => {
  setBgmOn(!bgmOn);
  playBgm(bgmOn, bgmType);
  ipcRenderer.send(BgmKey, bgmOn, bgmType);
});

ipcRenderer.removeAllListeners(OP_BACK);
ipcRenderer.on(OP_BACK, () => {
  console.log(OP_BACK);
  onback();
});

ipcRenderer.removeAllListeners(OP_RESTART);
ipcRenderer.on(OP_RESTART, () => {
  console.log(OP_RESTART);
  onRestart();
});
ipcRenderer.removeAllListeners(OP_ROTATION);
ipcRenderer.on(OP_ROTATION, () => {
  console.log(OP_ROTATION);
  onRotation();
});

export const defaultChessState = {
  on: bgmOn,
  type: bgmType,
  setType: setBgmType,
  setBgmOn: setBgmOn,
  mode: mode,
  setMode: setMode,
  updateBoardStatus(boardStatus: BoardStatus) {
    ipcRenderer.send(BoardStatusKey, boardStatus);
  },
  difficulty: difficulty,
  setDifficulty(diff: number) {
    difficulty = diff;
  },
  queryMove(fenStr: string, turn: boolean) {
    return queryMove(fenStr, turn);
  },
  setOnBack(backFunc: () => void) {
    onback = backFunc;
  },
  setOnRestart(restartFunc: () => void) {
    onRestart = restartFunc;
  },
  setOnRotation(rotationFunc: () => void) {
    onRotation = rotationFunc;
  },
  redSide: "none",
  setRedSide: (key: string) => {},
  blackSide: "none",
  setBlackSide: (key: string) => {},
  exit() {
    ipcRenderer.send(APPEXITKey);
  },
  syncSide: (obj: { red: string; black: string }) => {
    ipcRenderer.send(OP_UPDATE_SIDE, obj);
  },
  setChangeSideCallBack: (
    sideCallBackFunc: (prev: PlaySide, cur: PlaySide) => void
  ) => {},
};
export const ChessContext = createContext(defaultChessState);
