import { app, Menu, ipcMain } from "electron";
import {
  BoardStatus,
  BoardStatusKey,
  BgmKey,
  QueryMoveKey,
  APPEXITKey as AppExitKey,
  OP_UPDATE_SIDE,
} from "../common/IPCInfos";
import { GetTemplate } from "./menu";
import FeiJiang from "./feijiang";
export function InitIPC() {
  ipcMain.on(AppExitKey, (_evt, _arg): void => {
    app.quit();
  });
  ipcMain.handle(
    QueryMoveKey,
    async (event, { fenStr, difficulty, turn }) => {
      // const result = await fetch(
      //   `http://www.chessdb.cn/chessdb.php?action=querybest&board=${fenStr}`
      // );
      // return await result.text();
      const engine = await FeiJiang.getEngineByTurnAsync(turn);
      const dif: number | null = difficulty;

      console.log(
        `Recieve:${fenStr},difficulty ${difficulty},query engine ${engine.name} to get best move`
      );
      const info = await engine.infoAndMove(fenStr, {
        difficulty: dif,
        maxTime: FeiJiang.maxtime,
      });
      if (info) {
        console.log("bestmove", info.bestmove);
        return info.bestmove;
      } else {
        console.log("unable to get best move for ", fenStr);
        return "";
      }
    }
  );

  ipcMain.on(BoardStatusKey, (_evt, status: BoardStatus) => {
    FeiJiang.boardStaus = status;
    console.log(status);
    Menu.setApplicationMenu(Menu.buildFromTemplate(GetTemplate()));
  });

  ipcMain.on(BgmKey, (evt, bgm: boolean, type: string) => {
    console.log(bgm);
    Menu.setApplicationMenu(Menu.buildFromTemplate(GetTemplate()));
  });

  ipcMain.on(OP_UPDATE_SIDE, (evt, obj: { red: string; black: string }) => {
    FeiJiang.redSide = obj.red;
    FeiJiang.blackSide = obj.black;
    Menu.setApplicationMenu(Menu.buildFromTemplate(GetTemplate()));
  });
}
