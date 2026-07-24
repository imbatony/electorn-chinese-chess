import {
  BrowserWindow as BrowserWindowMain,
  IpcMainEvent,
  app as appMain,
  ipcMain,
  shell,
} from 'electron';

import * as path from 'path';

import {
  AboutAdjustWindowKey,
  AboutCloseWindowKey,
  AboutInfoKey,
  AboutInfoPayload,
  AboutOpenExternalKey,
  AboutPageInfo,
  AboutWindowInfo,
} from '../common/IPCInfos';
import { isAboutAdjustWindowRequest, isAllowedExternalUrl } from '../common/IPCSecurity';

import pkg from '../../package.json';

declare const ABOUT_WINDOW_WEBPACK_ENTRY: string;
declare const ABOUT_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

const aboutWebContentsIds = new Set<number>();

ipcMain.handle(AboutOpenExternalKey, async (event, url: unknown) => {
  if (!aboutWebContentsIds.has(event.sender.id) || event.senderFrame !== event.sender.mainFrame) {
    throw new Error('拒绝来自未知窗口或子框架的请求');
  }
  if (!isAllowedExternalUrl(url)) {
    throw new Error('仅允许打开 HTTP 或 HTTPS 链接');
  }
  await shell.openExternal(url);
});

// function loadPackageJson(pkg_path: string): PackageJson {
//     try {
//         return require(pkg_path);
//     } catch (e) {
//         return null;
//     }
// }

// function detectPackageJson(specified_dir: string, app: Electron.App) {
//     if (specified_dir) {
//         const pkg = loadPackageJson(path.join(specified_dir, 'package.json'));
//         if (pkg !== null) {
//             return pkg;
//         } else {
//             console.warn('about-window: package.json is not found in specified directory path: ' + specified_dir);
//         }
//     }

//     // Note: app.getName() was replaced with app.name at Electron v7
//     const app_name = app.name || app.getName();

//     for (const mod_path of (module as any).paths) {
//         if (!path.isAbsolute(mod_path)) {
//             continue;
//         }

//         const p = path.join(mod_path, '..', 'package.json');
//         try {
//             const stats = statSync(p);
//             if (stats.isFile()) {
//                 const pkg = loadPackageJson(p);
//                 if (pkg !== null && pkg.productName === app_name) {
//                     return pkg;
//                 }
//             }
//         } catch (e) {
//             // File not found.  Ignored.
//         }
//     }

//     // Note: Not found.
//     return null;
// }

function injectInfoFromPackageJson(info: AboutWindowInfo) {
  // const pkg = detectPackageJson(info.package_json_dir, app);
  console.log('pkg', pkg);
  if (pkg === null) {
    // Note: Give up.
    return info;
  }

  if (!info.product_name) {
    info.product_name = pkg.productName;
  }
  if (!info.description) {
    info.description = pkg.description;
  }
  if (!info.license && pkg.license) {
    const l = pkg.license;
    info.license = typeof l === 'string' ? l : '';
  }
  if (!info.homepage) {
    info.homepage = pkg.homepage;
  }
  if (!info.bug_report_url && typeof pkg.bugs === 'object') {
    info.bug_report_url = pkg.bugs.url;
  }
  if (info.use_inner_html === undefined) {
    info.use_inner_html = false;
  }
  if (info.use_version_info === undefined) {
    info.use_version_info = true;
  }

  return info;
}

export function openAboutWindow(info: AboutWindowInfo) {
  let window: Electron.BrowserWindow = null;
  const ipc = ipcMain ?? info.ipcMain;
  const app = appMain ?? info.app;
  const BrowserWindow = BrowserWindowMain ?? info.BrowserWindow;
  if (!app || !BrowserWindow || !ipc) {
    throw new Error(
      "openAboutWindow() is called on non-main process. Set 'app', 'BrowserWindow' and 'ipcMain' properties in the 'info' argument of the function call"
    );
  }

  if (window !== null) {
    window.focus();
    return window;
  }

  let base_path = info.about_page_dir;

  if (base_path === undefined || base_path === null || !base_path.length) {
    base_path = path.join(__dirname, '..');
  }

  const options = Object.assign(
    {
      width: 400,
      height: 400,
      useContentSize: true,
      titleBarStyle: 'hidden-inset',
      show: !info.adjust_window_size,
      webPreferences: {
        preload: ABOUT_WINDOW_PRELOAD_WEBPACK_ENTRY,
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
      },
    },
    info.win_options || {}
  );
  options.webPreferences = {
    ...(options.webPreferences || {}),
    preload: ABOUT_WINDOW_PRELOAD_WEBPACK_ENTRY,
    nodeIntegration: false,
    contextIsolation: true,
    sandbox: true,
  };

  window = new BrowserWindow(options);
  aboutWebContentsIds.add(window.webContents.id);

  const isTrustedSender = (event: IpcMainEvent) =>
    event.sender === window.webContents && event.senderFrame === event.sender.mainFrame;

  const on_win_adjust_req = (event: IpcMainEvent, request: unknown) => {
    if (!isTrustedSender(event)) {
      console.error('[About] 拒绝来自未知窗口或子框架的尺寸请求');
      return;
    }
    if (!isAboutAdjustWindowRequest(request)) {
      console.error('[About] 拒绝无效的窗口尺寸请求');
      return;
    }
    if (request.showCloseButton) {
      window.setContentSize(request.width, request.height + 40);
    } else {
      window.setContentSize(request.width, request.height + 52);
    }
  };
  const on_win_close_req = (event: IpcMainEvent) => {
    if (!isTrustedSender(event)) {
      console.error('[About] 拒绝来自未知窗口或子框架的关闭请求');
      return;
    }
    window.close();
  };
  ipc.on(AboutAdjustWindowKey, on_win_adjust_req);
  ipc.on(AboutCloseWindowKey, on_win_close_req);

  window.once('closed', () => {
    aboutWebContentsIds.delete(window.webContents.id);
    window = null;
    ipc.removeListener(AboutAdjustWindowKey, on_win_adjust_req);
    ipc.removeListener(AboutCloseWindowKey, on_win_close_req);
  });
  window.loadURL(ABOUT_WINDOW_WEBPACK_ENTRY);

  window.webContents.on('will-navigate', (e, url) => {
    e.preventDefault();
    if (isAllowedExternalUrl(url)) {
      void shell.openExternal(url);
    }
  });
  window.webContents.on('will-redirect', (e, url) => {
    e.preventDefault();
    if (isAllowedExternalUrl(url)) {
      void shell.openExternal(url);
    }
  });

  window.webContents.once('dom-ready', () => {
    const win_title = info.win_options ? info.win_options.title : null;
    delete info.win_options;
    info.win_options = { title: win_title };
    const app_name = info.product_name || app.name || app.getName();
    const version = app.getVersion();
    const pageInfo: AboutPageInfo = {
      visit_source_code_text: info.visit_source_code_text,
      product_name: info.product_name,
      copyright: info.copyright,
      homepage: info.homepage,
      description: info.description,
      license: info.license,
      bug_report_url: info.bug_report_url,
      css_path: info.css_path,
      adjust_window_size: info.adjust_window_size,
      use_inner_html: info.use_inner_html,
      bug_link_text: info.bug_link_text,
      use_version_info: info.use_version_info,
      show_close_button: info.show_close_button,
      title: win_title,
    };
    const payload: AboutInfoPayload = {
      info: pageInfo,
      appName: app_name,
      version,
      runtimeVersions: ['electron', 'chrome', 'node', 'v8'].map((name) => [
        name,
        process.versions[name],
      ]),
    };
    window.webContents.send(AboutInfoKey, payload);
    if (info.open_devtools) {
      if (process.versions.electron >= '1.4') {
        window.webContents.openDevTools({ mode: 'detach' });
      } else {
        window.webContents.openDevTools();
      }
    }
  });

  window.once('ready-to-show', () => {
    window.show();
  });

  window.setMenu(null);

  info = injectInfoFromPackageJson(info);

  return window;
}
