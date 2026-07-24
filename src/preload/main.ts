import { contextBridge, ipcRenderer } from 'electron';

import {
  APPEXITKey,
  AutoSaveCheckResponse,
  AutoSaveRecoveryOfferedKey,
  AutoSaveRequest,
  AutoSaveWriteKey,
  BgmKey,
  BoardStatusKey,
  ConfirmLoadKey,
  ExportExecuteKey,
  ExportRequest,
  LoadExecuteKey,
  MainBridge,
  OP_BACK,
  OP_EXPORT,
  OP_LOAD,
  OP_RESTART,
  OP_ROTATION,
  OP_SAVE,
  OP_TOGGLE_BGM,
  OP_UPDATE_SIDE,
  PlayerSides,
  QueryMoveKey,
  SaveExecuteKey,
  SaveRequest,
} from '../common/IPCInfos';

const on = <T>(channel: string, listener: (value: T) => void): (() => void) => {
  const wrapped = (_event: Electron.IpcRendererEvent, value: T) => listener(value);
  ipcRenderer.on(channel, wrapped);
  return () => ipcRenderer.removeListener(channel, wrapped);
};

const onCommand = (channel: string, listener: () => void): (() => void) => {
  const wrapped = () => listener();
  ipcRenderer.on(channel, wrapped);
  return () => ipcRenderer.removeListener(channel, wrapped);
};

let pendingRecovery: AutoSaveCheckResponse | undefined;
let recoveryListener: ((response: AutoSaveCheckResponse) => void) | undefined;
ipcRenderer.on(AutoSaveRecoveryOfferedKey, (_event, response: AutoSaveCheckResponse) => {
  if (recoveryListener) {
    recoveryListener(response);
  } else {
    pendingRecovery = response;
  }
});

const api: MainBridge = {
  exit: () => ipcRenderer.send(APPEXITKey),
  queryMove: (request) => ipcRenderer.invoke(QueryMoveKey, request),
  updateBoardStatus: (status) => ipcRenderer.send(BoardStatusKey, status),
  updateBgm: (status) => ipcRenderer.send(BgmKey, status),
  updateSides: (sides) => ipcRenderer.send(OP_UPDATE_SIDE, sides),
  confirmLoad: () => ipcRenderer.invoke(ConfirmLoadKey),
  saveGameRecord: (record) => ipcRenderer.invoke(SaveExecuteKey, { record } as SaveRequest),
  loadGameRecord: () => ipcRenderer.invoke(LoadExecuteKey),
  exportGameRecord: (record) => ipcRenderer.invoke(ExportExecuteKey, { record } as ExportRequest),
  autoSaveGameRecord: (record) =>
    ipcRenderer.invoke(AutoSaveWriteKey, { record } as AutoSaveRequest),
  onToggleBgm: (listener) => onCommand(OP_TOGGLE_BGM, listener),
  onBack: (listener) => onCommand(OP_BACK, listener),
  onRestart: (listener) => onCommand(OP_RESTART, listener),
  onRotation: (listener) => onCommand(OP_ROTATION, listener),
  onSave: (listener) => onCommand(OP_SAVE, listener),
  onLoad: (listener) => onCommand(OP_LOAD, listener),
  onExport: (listener) => onCommand(OP_EXPORT, listener),
  onSidesUpdated: (listener) => on<PlayerSides>(OP_UPDATE_SIDE, listener),
  onAutoSaveRecover: (listener) => {
    recoveryListener = listener;
    if (pendingRecovery) {
      const response = pendingRecovery;
      pendingRecovery = undefined;
      listener(response);
    }
    return () => {
      if (recoveryListener === listener) recoveryListener = undefined;
    };
  },
};

contextBridge.exposeInMainWorld('chessApi', api);
