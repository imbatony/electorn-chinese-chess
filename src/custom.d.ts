declare module '*.jpg';
declare module '*.png';
declare module '*.jpeg';
declare module '*.gif';
declare module '*.wav';
declare module '*.mp3';
declare module 'electron-squirrel-startup' {
  const isSquirrelStartup: boolean;
  export default isSquirrelStartup;
}

interface Window {
  chessApi: import('./common/IPCInfos').MainBridge;
  aboutApi: import('./common/IPCInfos').AboutBridge;
}
