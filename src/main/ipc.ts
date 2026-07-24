import { app, ipcMain } from 'electron';

import {
  APPEXITKey as AppExitKey,
  AutoSaveCheckKey,
  AutoSaveDiscardKey,
  AutoSaveRecoverKey,
  AutoSaveRequest,
  AutoSaveWriteKey,
  BgmKey,
  BoardStatus,
  BoardStatusKey,
  CheckDirtyKey,
  ExportExecuteKey,
  ExportRequest,
  LoadExecuteKey,
  OP_UPDATE_SIDE,
  QueryMoveKey,
  SaveExecuteKey,
  SaveRequest,
} from '../common/IPCInfos';
import { PgnExporter } from '../common/PgnExporter';
import FeiJiang from './feijiang';
import { gameRecordService } from './GameRecordService';
import { refreshMenu } from './menu';
import {
  updateBgmMenuState,
  updateBoardMenuState,
  updateSideMenuState,
} from './menu-state';

export function InitIPC() {
  ipcMain.on(AppExitKey, (_evt, _arg): void => {
    app.quit();
  });
  // 查询锁: 串行化所有引擎查询, 防止同一引擎实例上的并发 sendAsync 互相覆盖 callback
  let queryLock: Promise<void> = Promise.resolve();

  ipcMain.handle(QueryMoveKey, async (_event, { fenStr, difficulty, turn }) => {
    // 串行化: 等待前一个查询完成再开始本次
    const result = new Promise<string>((resolve) => {
      queryLock = queryLock.then(async () => {
        try {
          const engine = await FeiJiang.getEngineByTurnAsync(turn);
          const dif: number | null = difficulty;

          console.log(
            `Recieve:${fenStr},difficulty ${difficulty},query engine ${engine.name} to get best move`
          );
          const info = await engine.infoAndMove(fenStr, {
            difficulty: dif,
            maxTime: FeiJiang.maxtime,
          });
          if (info && info.bestmove) {
            console.log('bestmove', info.bestmove);
            resolve(info.bestmove);
          } else {
            console.log('unable to get best move for ', fenStr);
            resolve('');
          }
        } catch (err) {
          console.error('[QueryMove] Error:', err);
          resolve('');
        }
      });
    });
    return result;
  });

  ipcMain.on(BoardStatusKey, (_evt, status: BoardStatus | null) => {
    console.log(status);
    updateBoardMenuState(FeiJiang, status, refreshMenu);
  });

  ipcMain.on(BgmKey, (_evt, bgm: boolean, _type: string) => {
    console.log(bgm);
    updateBgmMenuState(FeiJiang, bgm, refreshMenu);
  });

  ipcMain.on(OP_UPDATE_SIDE, (_evt, obj: { red: string; black: string }) => {
    updateSideMenuState(FeiJiang, obj, refreshMenu);
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
