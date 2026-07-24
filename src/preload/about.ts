import { contextBridge, ipcRenderer } from 'electron';

import {
  AboutAdjustWindowKey,
  AboutBridge,
  AboutCloseWindowKey,
  AboutInfoKey,
  AboutInfoPayload,
  AboutOpenExternalKey,
} from '../common/IPCInfos';

const api: AboutBridge = {
  onInfo: (listener) => {
    const wrapped = (_event: Electron.IpcRendererEvent, payload: AboutInfoPayload) =>
      listener(payload);
    ipcRenderer.on(AboutInfoKey, wrapped);
    return () => ipcRenderer.removeListener(AboutInfoKey, wrapped);
  },
  adjustWindow: (request) => ipcRenderer.send(AboutAdjustWindowKey, request),
  closeWindow: () => ipcRenderer.send(AboutCloseWindowKey),
  openExternal: (url) => ipcRenderer.invoke(AboutOpenExternalKey, url),
};

contextBridge.exposeInMainWorld('aboutApi', api);
