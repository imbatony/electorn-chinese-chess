/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { createContext } from 'react';

import { EngineDifficulty } from '../common/EngineDifficulty';
import { GameRecord } from '../common/GameRecord';
import {
  AutoSaveResponse,
  BoardStatus,
  ExportResponse,
  LoadResponse,
  QueryMoveResponse,
  SaveResponse,
} from '../common/IPCInfos';

import { playBgm } from './Sound';
import { createRecoveryBuffer } from './recoveryBuffer';
import { PlaySide } from './types';

let onback: () => void;
let onRestart: () => void;
let onRotation: () => void;
let onSave: () => void;
let onExport: () => void;
let difficulty: EngineDifficulty = 1;
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
  window.chessApi.updateBgm({ enabled: bgmOn, type: bgmType });
};
const queryMove = (fenStr: string, turn: boolean) => {
  let dif = difficulty;
  if (mode !== 'normal') {
    dif = null;
  }
  return window.chessApi.queryMove({ fenStr, difficulty: dif, turn });
};
window.chessApi.onToggleBgm(() => {
  setBgmOn(!bgmOn);
  playBgm(bgmOn, bgmType);
  window.chessApi.updateBgm({ enabled: bgmOn, type: bgmType });
});

window.chessApi.onBack(() => {
  onback();
});

window.chessApi.onRestart(() => {
  onRestart();
});
window.chessApi.onRotation(() => {
  onRotation();
});

// 保存棋谱
window.chessApi.onSave(() => {
  if (onSave) onSave();
});

// 加载棋谱
const loadBuffer = createRecoveryBuffer();
window.chessApi.onLoad(async () => {
  // 检查是否有未保存的进度
  if (defaultChessState.isDirtyCallback() && !(await window.chessApi.confirmLoad())) {
    return;
  }

  const response: LoadResponse = await window.chessApi.loadGameRecord();
  if (response.success && response.record) {
    loadBuffer.offer(response.record);
  } else if (!response.success && response.error !== '用户取消加载') {
    console.error('[Load] Error:', response.error);
    alert(`加载失败: ${response.error ?? '未知错误'}`);
  }
});

// 导出 PGN
window.chessApi.onExport(() => {
  if (onExport) onExport();
});

// 保存执行函数
const saveGameRecord = async (record: GameRecord): Promise<SaveResponse> => {
  return window.chessApi.saveGameRecord(record);
};

// 导出执行函数
const exportGameRecord = async (record: GameRecord): Promise<ExportResponse> => {
  return window.chessApi.exportGameRecord(record);
};

// 自动保存函数
const autoSaveGameRecord = async (record: GameRecord): Promise<AutoSaveResponse> => {
  return window.chessApi.autoSaveGameRecord(record);
};

const recoveryBuffer = createRecoveryBuffer();
window.chessApi.onAutoSaveRecover((response) => {
  if (response.hasAutoSave && response.record) {
    recoveryBuffer.offer(response.record);
  }
});

export const subscribeAutoSaveRecovery = recoveryBuffer.subscribe;
export const subscribeGameRecordLoad = loadBuffer.subscribe;

export const defaultChessState = {
  on: bgmOn,
  type: bgmType,
  setType: setBgmType,
  setBgmOn: setBgmOn,
  mode: mode,
  setMode: setMode,
  updateBoardStatus(boardStatus: BoardStatus | null) {
    window.chessApi.updateBoardStatus(boardStatus);
  },
  difficulty: difficulty,
  setDifficulty(diff: EngineDifficulty) {
    difficulty = diff;
  },
  queryMove(fenStr: string, turn: boolean): Promise<QueryMoveResponse> {
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
  setOnExport(exportFunc: () => void) {
    onExport = exportFunc;
  },
  saveGameRecord,
  exportGameRecord,
  autoSaveGameRecord,
  // Dirty 状态检查回调
  isDirtyCallback: (): boolean => false,
  setIsDirtyCallback(callback: () => boolean) {
    this.isDirtyCallback = callback;
  },
  redSide: 'none',
  blackSide: 'none',
  setSides: (_sides: PlaySide) => {},
  exit() {
    window.chessApi.exit();
  },
  setChangeSideCallBack: (_sideCallBackFunc: (prev: PlaySide, cur: PlaySide) => void) => {},
};
export const ChessContext = createContext(defaultChessState);
