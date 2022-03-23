// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.

import {
  MenuItem,
  MenuItemConstructorOptions,
  clipboard,
  Notification,
  Menu,
} from "electron";
import { openAboutWindow } from "./about";
import {
  OP_BACK,
  OP_TOGGLE_BGM,
  OP_RESTART,
  OP_ROTATION,
  OP_COYPY_FEN,
  OP_UPDATE_SIDE,
} from "../common/IPCInfos";
import FeiJiang from "./feijiang";
import { GetAllEngineKeyNames } from "./UCCI";
const isMac = process.platform === "darwin";
const BuildItemsForSide = (side: boolean) => {};
export function GetTemplate() {
  const template: Array<MenuItemConstructorOptions | MenuItem> = [
    {
      label: "文件",
      submenu: [
        isMac
          ? { role: "close", label: "退出" }
          : { role: "quit", label: "退出" },
      ],
    },
    {
      label: "操作",
      submenu: [
        {
          id: OP_BACK,
          label: "悔棋",
          click: () => {
            FeiJiang.mainWin.webContents.send(OP_BACK);
          },
          enabled: !!FeiJiang.boardStaus && FeiJiang.boardStaus.canBack,
        },
        {
          id: OP_RESTART,
          label: "重新开始",
          click: () => {
            FeiJiang.mainWin.webContents.send(OP_RESTART);
          },
          enabled: !!FeiJiang.boardStaus,
        },
        {
          id: OP_ROTATION,
          label: "翻转",
          click: () => {
            FeiJiang.mainWin.webContents.send(OP_ROTATION);
          },
          enabled: !!FeiJiang.boardStaus,
        },
        {
          id: OP_TOGGLE_BGM,
          label: FeiJiang.bgm ? "关闭音乐" : "打开音乐",
          click: () => {
            FeiJiang.mainWin.webContents.send(OP_TOGGLE_BGM);
          },
          enabled: true,
        },
        {
          id: OP_COYPY_FEN,
          label: "复制盘面FEN码",
          click: () => {
            clipboard.writeText(FeiJiang.boardStaus?.curFen);
            new Notification({
              title: "复制成功",
              body: "复制盘面FEN码成功",
            }).show();
          },
          enabled: !!FeiJiang.boardStaus,
        },
      ],
    },
    {
      label: "游戏设置",
      submenu: [
        {
          label: "红方",
          submenu: [
            {
              label:
                FeiJiang.redSide === "human"
                  ? "象棋爱好者" + "☑️"
                  : "象棋爱好者",
              click: () => {
                FeiJiang.redSide = "human";
                Menu.setApplicationMenu(Menu.buildFromTemplate(GetTemplate()));
                FeiJiang.mainWin.webContents.send(OP_UPDATE_SIDE, {
                  red: FeiJiang.redSide,
                  black: FeiJiang.blackSide,
                });
              },
            },
            ...GetAllEngineKeyNames().map((e) => {
              return {
                label: FeiJiang.redSide === e.key ? e.name + "☑️" : e.name,
                click: () => {
                  FeiJiang.redSide = e.key;
                  Menu.setApplicationMenu(
                    Menu.buildFromTemplate(GetTemplate())
                  );
                  FeiJiang.mainWin.webContents.send(OP_UPDATE_SIDE, {
                    red: FeiJiang.redSide,
                    black: FeiJiang.blackSide,
                  });
                },
              };
            }),
          ],
        },
        {
          label: "黑方",
          submenu: [
            {
              label:
                FeiJiang.blackSide === "human"
                  ? "象棋爱好者" + "☑️"
                  : "象棋爱好者",
              click: () => {
                FeiJiang.blackSide = "human";
                Menu.setApplicationMenu(Menu.buildFromTemplate(GetTemplate()));
                FeiJiang.mainWin.webContents.send(OP_UPDATE_SIDE, {
                  red: FeiJiang.redSide,
                  black: FeiJiang.blackSide,
                });
              },
            },
            ...GetAllEngineKeyNames().map((e) => {
              return {
                label: FeiJiang.blackSide === e.key ? e.name + "☑️" : e.name,
                click: () => {
                  FeiJiang.blackSide = e.key;
                  Menu.setApplicationMenu(
                    Menu.buildFromTemplate(GetTemplate())
                  );
                  FeiJiang.mainWin.webContents.send(OP_UPDATE_SIDE, {
                    red: FeiJiang.redSide,
                    black: FeiJiang.blackSide,
                  });
                },
              };
            }),
          ],
        },
      ],
    },
    {
      label: "引擎设置",
    },
    {
      role: "help",
      label: "帮助",
      submenu: [
        {
          label: "关于",
          click: () => {
            openAboutWindow({
              copyright: "Copyright (c) 2022 esfak47",
              win_options: {
                parent: FeiJiang.mainWin,
                modal: true,
                title: "关于",
              },
              bug_link_text: "报告问题",
              visit_source_code_text: "访问源码",
              show_close_button: "Close",
              use_version_info: false,
            });
          },
        },
      ],
    },
  ];
  return template;
}
