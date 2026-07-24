import { IpcMainEvent, IpcMainInvokeEvent, app, dialog, ipcMain } from 'electron';

import { validateGameRecord } from '../common/GameRecord';
import {
  APPEXITKey as AppExitKey,
  AutoSaveRequest,
  AutoSaveWriteKey,
  BgmKey,
  BoardStatusKey,
  ConfirmLoadKey,
  ExportExecuteKey,
  ExportRequest,
  LoadExecuteKey,
  OP_UPDATE_SIDE,
  QueryMoveKey,
  QueryMoveResponse,
  SaveExecuteKey,
  SaveRequest,
} from '../common/IPCInfos';
import {
  isBgmStatus,
  isBoardStatus,
  isPlayerSides,
  isQueryMoveRequest,
} from '../common/IPCSecurity';
import { PgnExporter } from '../common/PgnExporter';

import { EngineConfigService } from './EngineConfigService';
import { gameRecordService } from './GameRecordService';
import FeiJiang from './feijiang';
import { writeAutoSave } from './gameRecordOperations';
import { refreshMenu } from './menu';
import { updateBgmMenuState, updateBoardMenuState, updateSideMenuState } from './menu-state';

export function InitIPC() {
  const isTrustedSender = (event: IpcMainEvent | IpcMainInvokeEvent): boolean => {
    const mainWindow = FeiJiang.mainWin;
    return (
      !!mainWindow &&
      !mainWindow.isDestroyed() &&
      event.sender === mainWindow.webContents &&
      event.senderFrame === event.sender.mainFrame
    );
  };
  const assertTrustedSender = (event: IpcMainInvokeEvent): void => {
    if (!isTrustedSender(event)) {
      throw new Error('拒绝来自未知窗口或子框架的 IPC 请求');
    }
  };

  ipcMain.on(AppExitKey, (event): void => {
    if (!isTrustedSender(event)) return;
    app.quit();
  });
  // 查询锁: 串行化所有引擎查询, 防止同一引擎实例上的并发 sendAsync 互相覆盖 callback
  let queryLock: Promise<void> = Promise.resolve();

  ipcMain.handle(QueryMoveKey, async (event, request: unknown) => {
    assertTrustedSender(event);
    if (!isQueryMoveRequest(request)) {
      throw new Error('无效的引擎查询参数');
    }
    const { fenStr, difficulty, turn } = request;
    // 串行化: 等待前一个查询完成再开始本次
    const result = queryLock.then(async (): Promise<QueryMoveResponse> => {
      try {
        const engine = await FeiJiang.getEngineByTurnAsync(turn);
        console.log(
          `Recieve:${fenStr},difficulty ${difficulty},query engine ${engine.name} to get best move`
        );
        const info = await engine.infoAndMove(fenStr, {
          difficulty,
          maxTime: FeiJiang.maxtime,
        });
        if (info.bestmove === null) return { status: 'no-legal-move' };
        console.log('bestmove', info.bestmove);
        return { status: 'move', move: info.bestmove };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error('[QueryMove] Error:', error);
        return { status: 'error', error: message };
      }
    });
    queryLock = result.then(
      (): void => {},
      (): void => {}
    );
    return result;
  });

  ipcMain.on(BoardStatusKey, (event, status: unknown) => {
    if (!isTrustedSender(event) || !isBoardStatus(status)) return;
    console.log(status);
    updateBoardMenuState(FeiJiang, status, refreshMenu);
  });

  ipcMain.on(BgmKey, (event, status: unknown) => {
    if (!isTrustedSender(event) || !isBgmStatus(status)) return;
    console.log(status.enabled);
    updateBgmMenuState(FeiJiang, status.enabled, refreshMenu);
  });

  ipcMain.on(OP_UPDATE_SIDE, (event, sides: unknown) => {
    const isKnownPlayer = (playerId: string) =>
      playerId === 'human' ||
      EngineConfigService.getInstance()
        .getAllEngines()
        .some((engine) => engine.id === playerId);
    if (!isTrustedSender(event) || !isPlayerSides(sides, isKnownPlayer)) return;
    updateSideMenuState(FeiJiang, sides, refreshMenu);
  });

  // ============================================================================
  // 棋谱保存/加载 IPC 处理器
  // ============================================================================

  // 保存棋谱
  ipcMain.handle(SaveExecuteKey, async (event, request: SaveRequest) => {
    assertTrustedSender(event);
    const validation = validateGameRecord(request?.record);
    if (!validation.valid) {
      return { success: false, error: `棋谱格式无效: ${validation.errors.join('; ')}` };
    }
    return await gameRecordService.save(request.record, FeiJiang.mainWin);
  });

  // 加载棋谱
  ipcMain.handle(LoadExecuteKey, async (event) => {
    assertTrustedSender(event);
    const response = await gameRecordService.load(FeiJiang.mainWin);
    if (!response.success) return response;
    try {
      gameRecordService.discardAutoSave();
      return response;
    } catch (error) {
      return {
        success: false,
        error: `棋谱已加载，但清理自动保存失败: ${
          error instanceof Error ? error.message : String(error)
        }`,
      };
    }
  });

  // 导出 PGN
  ipcMain.handle(ExportExecuteKey, async (event, request: ExportRequest) => {
    assertTrustedSender(event);
    const validation = validateGameRecord(request?.record);
    if (!validation.valid) {
      return { success: false, error: `棋谱格式无效: ${validation.errors.join('; ')}` };
    }
    const pgnContent = PgnExporter.toPgn(request.record);
    return await gameRecordService.export(request.record, pgnContent, FeiJiang.mainWin);
  });

  ipcMain.handle(ConfirmLoadKey, async (event) => {
    assertTrustedSender(event);
    const result = await dialog.showMessageBox(FeiJiang.mainWin, {
      type: 'warning',
      buttons: ['继续加载', '取消'],
      defaultId: 1,
      cancelId: 1,
      title: '未保存的进度',
      message: '当前对局尚未保存，加载新棋谱将丢失当前进度。是否继续？',
    });
    return result.response === 0;
  });

  // ============================================================================
  // 自动保存 IPC 处理器
  // ============================================================================

  // 自动保存写入
  ipcMain.handle(AutoSaveWriteKey, async (event, request: AutoSaveRequest) => {
    assertTrustedSender(event);
    return writeAutoSave(gameRecordService, request?.record);
  });
}
