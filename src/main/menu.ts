// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
import {
  clipboard,
  dialog,
  Menu,
  MenuItem,
  MenuItemConstructorOptions,
  Notification,
} from 'electron';

import {
  OP_BACK,
  OP_COYPY_FEN,
  OP_EXPORT,
  OP_LOAD,
  OP_RESTART,
  OP_ROTATION,
  OP_SAVE,
  OP_TOGGLE_BGM,
  OP_UPDATE_SIDE,
} from '../common/IPCInfos';
import { openAboutWindow } from './about';
import { EngineConfigService } from './EngineConfigService';
import FeiJiang from './feijiang';
import {
  getBgmMenuLabel,
  getBoardMenuState,
  getPlayerMenuLabel,
  updateSideMenuState,
} from './menu-state';

const isMac = process.platform === 'darwin';

export function refreshMenu(): void {
  const mainWindow = FeiJiang.mainWin;
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }
  mainWindow.setMenu(Menu.buildFromTemplate(GetTemplate()));
}

function setPlayerSide(side: 'red' | 'black', playerId: string): void {
  const sides = {
    red: side === 'red' ? playerId : FeiJiang.redSide,
    black: side === 'black' ? playerId : FeiJiang.blackSide,
  };
  updateSideMenuState(FeiJiang, sides, refreshMenu);
  FeiJiang.mainWin?.webContents.send(OP_UPDATE_SIDE, sides);
}

export function GetTemplate() {
  const boardMenuState = getBoardMenuState(FeiJiang.boardStaus);
  const template: Array<MenuItemConstructorOptions | MenuItem> = [
    {
      label: '文件',
      submenu: [
        {
          id: OP_SAVE,
          label: '保存棋谱',
          accelerator: 'CmdOrCtrl+S',
          click: () => {
            FeiJiang.mainWin.webContents.send(OP_SAVE);
          },
          enabled: boardMenuState.canSave,
        },
        {
          id: OP_LOAD,
          label: '加载棋谱',
          accelerator: 'CmdOrCtrl+O',
          click: () => {
            FeiJiang.mainWin.webContents.send(OP_LOAD);
          },
          enabled: true,
        },
        {
          id: OP_EXPORT,
          label: '导出PGN',
          accelerator: 'CmdOrCtrl+E',
          click: () => {
            FeiJiang.mainWin.webContents.send(OP_EXPORT);
          },
          enabled: boardMenuState.canExport,
        },
        { type: 'separator' },
        isMac ? { role: 'close', label: '退出' } : { role: 'quit', label: '退出' },
      ],
    },
    {
      label: '操作',
      submenu: [
        {
          id: OP_BACK,
          label: '悔棋',
          click: () => {
            FeiJiang.mainWin.webContents.send(OP_BACK);
          },
          enabled: boardMenuState.canBack,
        },
        {
          id: OP_RESTART,
          label: '重新开始',
          click: () => {
            FeiJiang.mainWin.webContents.send(OP_RESTART);
          },
          enabled: boardMenuState.canRestart,
        },
        {
          id: OP_ROTATION,
          label: '翻转',
          click: () => {
            FeiJiang.mainWin.webContents.send(OP_ROTATION);
          },
          enabled: boardMenuState.canRotate,
        },
        {
          id: OP_TOGGLE_BGM,
          label: getBgmMenuLabel(FeiJiang.bgm),
          click: () => {
            FeiJiang.mainWin.webContents.send(OP_TOGGLE_BGM);
          },
          enabled: true,
        },
        {
          id: OP_COYPY_FEN,
          label: '复制盘面FEN码',
          click: () => {
            clipboard.writeText(FeiJiang.boardStaus?.curFen);
            new Notification({
              title: '复制成功',
              body: '复制盘面FEN码成功',
            }).show();
          },
          enabled: boardMenuState.canCopyFen,
        },
      ],
    },
    {
      label: '游戏设置',
      submenu: [
        {
          label: '红方',
          submenu: [
            {
              label: getPlayerMenuLabel('象棋爱好者', 'human', FeiJiang.redSide),
              click: () => {
                setPlayerSide('red', 'human');
              },
            },
            ...EngineConfigService.getInstance()
              .getAllEngines()
              .map((e) => {
                const available = EngineConfigService.getInstance().isEngineAvailable(e);
                return {
                  label: getPlayerMenuLabel(e.name, e.id, FeiJiang.redSide, available),
                  enabled: available,
                  click: () => {
                    if (!EngineConfigService.getInstance().isEngineAvailable(e)) {
                      new Notification({
                        title: '引擎不可用',
                        body: '引擎文件不存在, 请重新加载或移除该引擎',
                      }).show();
                      return;
                    }
                    setPlayerSide('red', e.id);
                  },
                };
              }),
          ],
        },
        {
          label: '黑方',
          submenu: [
            {
              label: getPlayerMenuLabel('象棋爱好者', 'human', FeiJiang.blackSide),
              click: () => {
                setPlayerSide('black', 'human');
              },
            },
            ...EngineConfigService.getInstance()
              .getAllEngines()
              .map((e) => {
                const available = EngineConfigService.getInstance().isEngineAvailable(e);
                return {
                  label: getPlayerMenuLabel(e.name, e.id, FeiJiang.blackSide, available),
                  enabled: available,
                  click: () => {
                    if (!EngineConfigService.getInstance().isEngineAvailable(e)) {
                      new Notification({
                        title: '引擎不可用',
                        body: '引擎文件不存在, 请重新加载或移除该引擎',
                      }).show();
                      return;
                    }
                    setPlayerSide('black', e.id);
                  },
                };
              }),
          ],
        },
      ],
    },
    {
      label: '引擎设置',
      submenu: [
        {
          label: '加载引擎...',
          click: async () => {
            const result = await dialog.showOpenDialog(FeiJiang.mainWin, {
              title: '选择引擎文件',
              filters: [{ name: 'Engine', extensions: ['exe'] }],
              properties: ['openFile'],
            });
            if (result.canceled || result.filePaths.length === 0) return;

            const exePath = result.filePaths[0];
            const configService = EngineConfigService.getInstance();

            try {
              const probeResult = await configService.probeEngine(exePath);
              if (!probeResult.success) {
                new Notification({
                  title: '加载失败',
                  body: probeResult.error || '无法识别引擎协议',
                }).show();
                return;
              }

              configService.addCustomEngine(exePath, probeResult);
              refreshMenu();
              new Notification({
                title: '加载成功',
                body: `已添加引擎: ${probeResult.name || exePath}`,
              }).show();
            } catch (err) {
              new Notification({
                title: '加载失败',
                body: err instanceof Error ? err.message : '未知错误',
              }).show();
            }
          },
        },
        { type: 'separator' },
        ...(() => {
          const configService = EngineConfigService.getInstance();
          const customEngines = configService.getAllEngines().filter((e) => !e.builtin);
          if (customEngines.length === 0) {
            return [{ label: '暂无自定义引擎', enabled: false }] as MenuItemConstructorOptions[];
          }
          return customEngines.map((e) => ({
            label: `${e.name} ❌ 移除`,
            click: () => {
              // Check if engine is in use
              const engines = FeiJiang.engines;
              if (engines.has(e.id)) {
                new Notification({
                  title: '无法移除',
                  body: '该引擎正在使用中, 请先切换到其他引擎',
                }).show();
                return;
              }
              configService.removeCustomEngine(e.id);
              refreshMenu();
              new Notification({
                title: '移除成功',
                body: `已移除引擎: ${e.name}`,
              }).show();
            },
          })) as MenuItemConstructorOptions[];
        })(),
      ],
    },
    {
      role: 'help',
      label: '帮助',
      submenu: [
        {
          label: '关于',
          click: () => {
            openAboutWindow({
              copyright: 'Copyright (c) 2022 esfak47',
              win_options: {
                parent: FeiJiang.mainWin,
                modal: true,
                title: '关于',
              },
              bug_link_text: '报告问题',
              visit_source_code_text: '访问源码',
              show_close_button: 'Close',
              use_version_info: false,
            });
          },
        },
      ],
    },
  ];
  return template;
}
