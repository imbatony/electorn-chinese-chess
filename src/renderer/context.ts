/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { createContext } from 'react';

import {
  APPEXITKey,
  BgmKey,
  BoardStatus,
  BoardStatusKey,
  OP_BACK,
  OP_RESTART,
  OP_ROTATION,
  OP_TOGGLE_BGM,
  OP_UPDATE_SIDE,
  OP_SAVE,
  OP_LOAD,
  OP_EXPORT,
  QueryMoveKey,
  SaveExecuteKey,
  SaveRequest,
  SaveResponse,
  LoadExecuteKey,
  LoadResponse,
  ExportExecuteKey,
  ExportRequest,
  ExportResponse,
  AutoSaveWriteKey,
  AutoSaveRequest,
  AutoSaveCheckKey,
  AutoSaveCheckResponse,
} from '../common/IPCInfos';
import { GameRecord } from '../common/GameRecord';
import { playBgm } from './Sound';
import { PlaySide } from './types';

const { ipcRenderer } = window.require('electron');
let onback: () => void;
let onRestart: () => void;
let onRotation: () => void;
let onSave: () => void;
let onLoad: (record: GameRecord) => void;
let onExport: () => void;
let difficulty = 1;
let bgmOn = true;
let mode = 'normal';
let bgmType: 'welcome' | 'board' = 'welcome';

const setBgmOn = (bgm: boolean) => {
  bgmOn = bgm;
};
const setMode = (m: string) => {
  mode = m;
};
const setBgmType = (type: 'welcome' | 'board') => {
  bgmType = type;
  playBgm(bgmOn, bgmType);
  ipcRenderer.send(BgmKey, bgmOn, bgmType);
};
const queryMove = (fenStr: string, turn: boolean) => {
  let dif = difficulty;
  if (mode !== 'normal') {
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

// 保存棋谱
ipcRenderer.removeAllListeners(OP_SAVE);
ipcRenderer.on(OP_SAVE, () => {
  console.log(OP_SAVE);
  if (onSave) onSave();
});

// 加载棋谱
ipcRenderer.removeAllListeners(OP_LOAD);
ipcRenderer.on(OP_LOAD, async () => {
  console.log(OP_LOAD);
  
  // 检查是否有未保存的进度
  if (defaultChessState.isDirtyCallback()) {
    const { dialog } = window.require('@electron/remote');
    const result = await dialog.showMessageBox({
      type: 'warning',
      buttons: ['继续加载', '取消'],
      defaultId: 1,
      cancelId: 1,
      title: '未保存的进度',
      message: '当前对局尚未保存，加载新棋谱将丢失当前进度。是否继续？',
    });
    if (result.response !== 0) {
      return;
    }
  }
  
  const response: LoadResponse = await ipcRenderer.invoke(LoadExecuteKey);
  if (response.success && response.record && onLoad) {
    onLoad(response.record);
  } else if (!response.success && response.error !== '用户取消加载') {
    console.error('[Load] Error:', response.error);
  }
});

// 导出 PGN
ipcRenderer.removeAllListeners(OP_EXPORT);
ipcRenderer.on(OP_EXPORT, () => {
  console.log(OP_EXPORT);
  if (onExport) onExport();
});

// 保存执行函数
const saveGameRecord = async (record: GameRecord): Promise<SaveResponse> => {
  return ipcRenderer.invoke(SaveExecuteKey, { record } as SaveRequest);
};

// 导出执行函数
const exportGameRecord = async (record: GameRecord): Promise<ExportResponse> => {
  return ipcRenderer.invoke(ExportExecuteKey, { record } as ExportRequest);
};

// 自动保存函数
const autoSaveGameRecord = async (record: GameRecord): Promise<void> => {
  await ipcRenderer.invoke(AutoSaveWriteKey, { record } as AutoSaveRequest);
};

// 自动保存恢复回调
let onAutoSaveRecover: (record: GameRecord) => void;
ipcRenderer.removeAllListeners(AutoSaveCheckKey);
ipcRenderer.on(AutoSaveCheckKey, (_evt: unknown, response: AutoSaveCheckResponse) => {
  if (response.hasAutoSave && response.record && onAutoSaveRecover) {
    onAutoSaveRecover(response.record);
  }
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
  queryMove(fenStr: string, turn: boolean): Promise<string> {
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
  // 棋谱保存/加载
  setOnSave(saveFunc: () => void) {
    onSave = saveFunc;
  },
  setOnLoad(loadFunc: (record: GameRecord) => void) {
    onLoad = loadFunc;
  },
  setOnExport(exportFunc: () => void) {
    onExport = exportFunc;
  },
  saveGameRecord,
  exportGameRecord,
  autoSaveGameRecord,
  setOnAutoSaveRecover(callback: (record: GameRecord) => void) {
    onAutoSaveRecover = callback;
  },
  // Dirty 状态检查回调
  isDirtyCallback: (): boolean => false,
  setIsDirtyCallback(callback: () => boolean) {
    this.isDirtyCallback = callback;
  },
  redSide: 'none',
  setRedSide: (_key: string) => {},
  blackSide: 'none',
  setBlackSide: (_key: string) => {},
  exit() {
    ipcRenderer.send(APPEXITKey);
  },
  syncSide: (obj: { red: string; black: string }) => {
    ipcRenderer.send(OP_UPDATE_SIDE, obj);
  },
  setChangeSideCallBack: (_sideCallBackFunc: (prev: PlaySide, cur: PlaySide) => void) => {},
};
export const ChessContext = createContext(defaultChessState);
