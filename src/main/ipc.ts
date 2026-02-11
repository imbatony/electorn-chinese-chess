import { app, ipcMain,Menu } from 'electron';

import {
  APPEXITKey as AppExitKey,
  BgmKey,
  BoardStatus,
  BoardStatusKey,
  OP_UPDATE_SIDE,
  QueryMoveKey,
  SaveExecuteKey,
  SaveRequest,
  LoadExecuteKey,
  ExportExecuteKey,
  ExportRequest,
  AutoSaveWriteKey,
  AutoSaveRequest,
  AutoSaveCheckKey,
  AutoSaveRecoverKey,
  AutoSaveDiscardKey,
  CheckDirtyKey,
} from '../common/IPCInfos';
import FeiJiang from './feijiang';
import { gameRecordService } from './GameRecordService';
import { GetTemplate } from './menu';
import { PgnExporter } from '../common/PgnExporter';

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

  // ============================================================================
  // 棋谱保存/加载 IPC 处理器
  // ============================================================================

  // 保存棋谱
  ipcMain.handle(SaveExecuteKey, async (_event, request: SaveRequest) => {
    return await gameRecordService.save(request.record, FeiJiang.mainWin);
  });

  // 加载棋谱
  ipcMain.handle(LoadExecuteKey, async () => {
    return await gameRecordService.load(FeiJiang.mainWin);
  });

  // 导出 PGN
  ipcMain.handle(ExportExecuteKey, async (_event, request: ExportRequest) => {
    const pgnContent = PgnExporter.toPgn(request.record);
    return await gameRecordService.export(request.record, pgnContent, FeiJiang.mainWin);
  });

  // ============================================================================
  // 自动保存 IPC 处理器
  // ============================================================================

  // 自动保存写入
  ipcMain.handle(AutoSaveWriteKey, async (_event, request: AutoSaveRequest) => {
    gameRecordService.autoSave(request.record);
    return { success: true };
  });

  // 检查自动保存
  ipcMain.handle(AutoSaveCheckKey, async () => {
    return gameRecordService.checkAutoSave();
  });

  // 恢复自动保存
  ipcMain.handle(AutoSaveRecoverKey, async () => {
    const result = gameRecordService.checkAutoSave();
    if (result.hasAutoSave && result.record) {
      // 丢弃自动保存文件
      gameRecordService.discardAutoSave();
      return { success: true, record: result.record };
    }
    return { success: false };
  });

  // 丢弃自动保存
  ipcMain.handle(AutoSaveDiscardKey, async () => {
    gameRecordService.discardAutoSave();
    return { success: true };
  });

  // ============================================================================
  // Dirty 状态检查
  // ============================================================================

  // 检查未保存状态 (由渲染进程响应)
  ipcMain.handle(CheckDirtyKey, async () => {
    // 发送给渲染进程查询 dirty 状态
    FeiJiang.mainWin.webContents.send(CheckDirtyKey);
  });
}
