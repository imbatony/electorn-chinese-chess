import { app, ipcMain,Menu } from 'electron';

import {
  APPEXITKey as AppExitKey,
  BgmKey,
  BoardStatus,
  BoardStatusKey,
  OP_UPDATE_SIDE,
  QueryMoveKey,
} from '../common/IPCInfos';
import FeiJiang from './feijiang';
import { GetTemplate } from './menu';

export function InitIPC() {
  ipcMain.on(AppExitKey, (_evt, _arg): void => {
    app.quit();
  });
  ipcMain.handle(QueryMoveKey, async (event, { fenStr, difficulty, turn }) => {
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
      console.log('bestmove', info.bestmove);
      return info.bestmove;
    } else {
      console.log('unable to get best move for ', fenStr);
      return '';
    }
  });

  ipcMain.on(BoardStatusKey, (_evt, status: BoardStatus) => {
    FeiJiang.boardStaus = status;
    console.log(status);
    FeiJiang.mainWin.setMenu(Menu.buildFromTemplate(GetTemplate()));
  });

  ipcMain.on(BgmKey, (_evt, bgm: boolean, _type: string) => {
    console.log(bgm);
    FeiJiang.mainWin.setMenu(Menu.buildFromTemplate(GetTemplate()));
  });

  ipcMain.on(OP_UPDATE_SIDE, (evt, obj: { red: string; black: string }) => {
    FeiJiang.redSide = obj.red;
    FeiJiang.blackSide = obj.black;
    FeiJiang.mainWin.setMenu(Menu.buildFromTemplate(GetTemplate()));
  });
}
