import { FEN } from "./Fen";

export interface AboutWindowInfo {
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

export const BoardStatusKey = "render:boardstatus"
export const QueryMoveKey = "render:boardstatus"
export const APPEXITKey = "close-me"
export const BgmKey = "render:bgm"
export const OP_BACK = "op:back"
export const OP_RESTART = "op:restart"
export const OP_ROTATION = "op:rotation"
export const OP_TOGGLE_BGM = "op:togglebgm"
export const OP_COYPY_FEN = "op:copyfen"
export interface BoardStatus {
  curFen: string;
  canBack: boolean;
  isEnd: boolean;
}
