
export interface AboutWindowInfo {
  visit_source_code_text?: string;
  product_name?: string;
  copyright?: string;
  homepage?: string;
  description?: string;
  package_json_dir?: string;
  about_page_dir?: string;
  license?: string;
  bug_report_url?: string;
  css_path?: string | string[];
  adjust_window_size?: boolean;
  win_options?: Electron.BrowserWindowConstructorOptions;
  open_devtools?: boolean;
  use_inner_html?: boolean;
  bug_link_text?: string;
  use_version_info?: boolean | [string, string][];
  show_close_button?: string;
  app?: Electron.App;
  BrowserWindow?: typeof Electron.BrowserWindow;
  ipcMain?: Electron.IpcMain;
}

export const BoardStatusKey = 'render:boardstatus';
export const QueryMoveKey = 'render:querymove';
export const APPEXITKey = 'close-me';
export const BgmKey = 'render:bgm';
export const OP_BACK = 'op:back';
export const OP_RESTART = 'op:restart';
export const OP_ROTATION = 'op:rotation';
export const OP_TOGGLE_BGM = 'op:togglebgm';
export const OP_COYPY_FEN = 'op:copyfen';
export const OP_UPDATE_SIDE = 'op:updateside';
export interface BoardStatus {
  curFen: string;
  canBack: boolean;
  isEnd: boolean;
  /** 已走步数 */
  moveCount?: number;
  /** 是否处于回放模式 */
  isPlaybackMode?: boolean;
}

// ============================================================================
// 棋谱保存/加载 IPC 通道
// ============================================================================

import { GameRecord } from './GameRecord';

// --- 保存操作 ---
/** 菜单触发保存 (Main → Renderer) */
export const OP_SAVE = 'op:save';
/** 执行保存 (Renderer → Main) */
export const SaveExecuteKey = 'save:execute';

export interface SaveRequest {
  record: GameRecord;
}

export interface SaveResponse {
  success: boolean;
  filePath?: string;
  error?: string;
}

// --- 加载操作 ---
/** 菜单触发加载 (Main → Renderer) */
export const OP_LOAD = 'op:load';
/** 执行加载 (Renderer → Main) */
export const LoadExecuteKey = 'load:execute';

export interface LoadResponse {
  success: boolean;
  record?: GameRecord;
  error?: string;
}

// --- 导出操作 ---
/** 菜单触发导出 (Main → Renderer) */
export const OP_EXPORT = 'op:export';
/** 执行导出 (Renderer → Main) */
export const ExportExecuteKey = 'export:execute';

export interface ExportRequest {
  record: GameRecord;
}

export interface ExportResponse {
  success: boolean;
  filePath?: string;
  error?: string;
}

// --- 自动保存 ---
/** 自动保存写入 (Renderer → Main) */
export const AutoSaveWriteKey = 'autosave:write';
/** 检查自动保存 (Main → Renderer) */
export const AutoSaveCheckKey = 'autosave:check';
/** 恢复自动保存 */
export const AutoSaveRecoverKey = 'autosave:recover';
/** 丢弃自动保存 */
export const AutoSaveDiscardKey = 'autosave:discard';

export interface AutoSaveRequest {
  record: GameRecord;
}

export interface AutoSaveCheckResponse {
  hasAutoSave: boolean;
  record?: GameRecord;
  timestamp?: string;
}

// --- Dirty 状态检查 ---
/** 检查未保存状态 (Main → Renderer) */
export const CheckDirtyKey = 'game:check-dirty';

export interface CheckDirtyResponse {
  isDirty: boolean;
}
