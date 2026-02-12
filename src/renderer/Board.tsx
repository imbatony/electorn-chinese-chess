import * as React from 'react';
import { useState, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';

import { GameRecord, MoveEntry, GAME_RECORD_VERSION, DEFAULT_INITIAL_FEN } from '../common/GameRecord';
import { PointsToICCS } from '../common/ICCS';
import { ChessBoard } from './components/ChessBoard';
import { CommandBar } from './components/CommandBar';
import { PlaybackBar } from './components/PlaybackBar';
import { ChessContext } from './context';
import { event } from './Event';
import { useFEN } from './hooks';
import { PlaySide } from './types';

const Board = () => {
  const params = useParams();
  const chessCtx = React.useContext(ChessContext);
  const fenParams = params.fen;
  const rotationParm: boolean = (params.rotation ?? 'true') === 'true';
  const [rotation, setRotation] = useState(rotationParm);
  const [isDirty, setIsDirty] = useState(false);
  const lastSavedMoveCount = useRef(0);
  /** 防止同一局面重复发起 AI 查询 */
  const queryPending = useRef(false);
  const {
    fen, push, back, canback, restart,
    moveIndex, moveCount, isPlaybackMode,
    initialFen, getFenArray, loadFromRecord,
    goToMove, goForward, goBack, goToStart, goToEnd,
    continueFromPosition, setPlaybackMode
  } = useFEN(fenParams);

  React.useEffect(() => {
    chessCtx.setType('board');
  }, []);

  const terminate = (red: boolean) => {
    alert(`${red ? '红' : '黑'}方胜`);
  };

  const callBack = React.useCallback(
    (prev: PlaySide, cur: PlaySide) => {
      // 回放模式下不触发 AI
      if (isPlaybackMode) return;
      if (queryPending.current) return;
      
      console.log(prev, cur);
      let shouldQuery = false;
      if (prev.red != cur.red && fen.isRedTurn() && prev.red === 'human') {
        shouldQuery = true;
      } else if (prev.black != cur.black && !fen.isRedTurn() && prev.black === 'human') {
        shouldQuery = true;
      }
      if (shouldQuery) {
        queryPending.current = true;
        chessCtx.queryMove(fen.getFenWithMove(), fen.isRedTurn()).then((move) => {
          queryPending.current = false;
          console.log('move:', move);
          if (move && move.length >= 4) {
            event.emit('move', move);
          }
        }).catch(() => { queryPending.current = false; });
      }
    },
    [fen, isPlaybackMode]
  );

  React.useEffect(() => {
    chessCtx.setChangeSideCallBack(callBack);
  }, [callBack]);

  React.useEffect(() => {
    event.addListener('terminate', terminate);
    return () => {
      event.removeListener('terminate', terminate);
    };
  }, []);

  React.useEffect(() => {
    console.log('updateBoardStatus', canback, fen);
    chessCtx.updateBoardStatus({
      canBack: canback,
      isEnd: false,
      curFen: fen.getFenWithMove(),
      moveCount: moveCount,
      isPlaybackMode: isPlaybackMode,
    });
    
    // 回放模式下不触发 AI
    if (isPlaybackMode) return;
    
    const needquey = fen.isRedTurn()
      ? chessCtx.redSide !== 'human'
      : chessCtx.blackSide !== 'human';
    if (needquey && !queryPending.current) {
      queryPending.current = true;
      chessCtx.queryMove(fen.getFenWithMove(), fen.isRedTurn()).then((move) => {
        queryPending.current = false;
        console.log('move:', move);
        if (move && move.length >= 4) {
          event.emit('move', move);
        } else {
          console.warn('Engine returned invalid move, skipped:', move);
        }
      }).catch(() => { queryPending.current = false; });
    }
  }, [canback, fen, moveCount, isPlaybackMode]);

  React.useEffect(() => {
    event.removeAllListeners('newmove');
    event.addListener('newmove', push);
  }, [push]);

  React.useEffect(() => {
    chessCtx.setOnBack(back);
  }, [back]);

  React.useEffect(() => {
    chessCtx.setOnRestart(restart);
  }, [restart]);

  React.useEffect(() => {
    chessCtx.setOnRotation(() => {
      setRotation(!rotation);
    });
  }, [rotation]);

  // ========== 棋谱保存/加载 ==========

  /**
   * 收集当前游戏状态构建 GameRecord
   */
  const collectGameRecord = useCallback((): GameRecord => {
    const fenArray = getFenArray();
    const moves: MoveEntry[] = [];

    // 从 FEN 数组重建着法序列
    for (let i = 1; i < fenArray.length; i++) {
      const lastMove = fenArray[i].getLastMove();
      const iccs = PointsToICCS(lastMove[0], lastMove[1], lastMove[2], lastMove[3]);
      moves.push({
        iccs,
        fen: fenArray[i].getFen(),
        index: i,
      });
    }

    // 确定游戏模式
    let gameMode = 'human-vs-human';
    if (chessCtx.redSide !== 'human' && chessCtx.blackSide !== 'human') {
      gameMode = 'ai-vs-ai';
    } else if (chessCtx.redSide !== 'human' || chessCtx.blackSide !== 'human') {
      gameMode = 'human-vs-ai';
    }

    const record: GameRecord = {
      version: GAME_RECORD_VERSION,
      metadata: {
        date: new Date().toISOString(),
        redPlayer: {
          type: chessCtx.redSide === 'human' ? 'human' : chessCtx.redSide,
          name: chessCtx.redSide === 'human' ? '象棋爱好者' : undefined,
        },
        blackPlayer: {
          type: chessCtx.blackSide === 'human' ? 'human' : chessCtx.blackSide,
          name: chessCtx.blackSide === 'human' ? '象棋爱好者' : undefined,
        },
        result: 'incomplete',
        gameMode,
      },
      initialFen: initialFen,
      moves,
      currentIndex: moveIndex,
    };

    return record;
  }, [getFenArray, chessCtx.redSide, chessCtx.blackSide, initialFen, moveIndex]);

  /**
   * 保存棋谱
   */
  const handleSave = useCallback(async () => {
    const record = collectGameRecord();
    const response = await chessCtx.saveGameRecord(record);
    if (response.success) {
      console.log('Game saved to:', response.filePath);
      setIsDirty(false);
      lastSavedMoveCount.current = moveCount;
    } else if (response.error !== '用户取消保存') {
      console.error('Save failed:', response.error);
      alert(`保存失败: ${response.error}`);
    }
  }, [collectGameRecord, chessCtx, moveCount]);

  /**
   * 加载棋谱
   */
  const handleLoad = useCallback((record: GameRecord) => {
    console.log('Loading record:', record);
    loadFromRecord(record);
    
    // 恢复红黑方设置
    const redType = record.metadata.redPlayer.type;
    const blackType = record.metadata.blackPlayer.type;
    chessCtx.setRedSide(redType);
    chessCtx.setBlackSide(blackType);
    chessCtx.syncSide({ red: redType, black: blackType });
  }, [loadFromRecord, chessCtx]);

  /**
   * 导出 PGN
   */
  const handleExport = useCallback(async () => {
    const record = collectGameRecord();
    const response = await chessCtx.exportGameRecord(record);
    if (response.success) {
      console.log('PGN exported to:', response.filePath);
    } else if (response.error !== '用户取消导出') {
      console.error('Export failed:', response.error);
      alert(`导出失败: ${response.error}`);
    }
  }, [collectGameRecord, chessCtx]);

  /**
   * 继续对局
   */
  const handleContinue = useCallback(() => {
    continueFromPosition();
  }, [continueFromPosition]);

  // 注册保存/加载/导出回调
  React.useEffect(() => {
    chessCtx.setOnSave(handleSave);
  }, [handleSave]);

  React.useEffect(() => {
    chessCtx.setOnLoad(handleLoad);
  }, [handleLoad]);

  React.useEffect(() => {
    chessCtx.setOnExport(handleExport);
  }, [handleExport]);

  // 自动保存恢复
  React.useEffect(() => {
    chessCtx.setOnAutoSaveRecover(handleLoad);
  }, [handleLoad]);

  // 设置 dirty 状态检查回调
  React.useEffect(() => {
    chessCtx.setIsDirtyCallback(() => isDirty);
  }, [isDirty]);

  // 自动保存 (每次移动后)
  React.useEffect(() => {
    if (moveCount > 0 && !isPlaybackMode) {
      const record = collectGameRecord();
      chessCtx.autoSaveGameRecord(record);
      // 标记为脏状态
      if (moveCount > lastSavedMoveCount.current) {
        setIsDirty(true);
      }
    }
  }, [moveCount, isPlaybackMode, collectGameRecord]);

  return (
    <div className="chessboard">
      <div className="stack" style={{ paddingTop: 20 }}>
        <ChessBoard {...{ rotation, push, fen }}></ChessBoard>
      </div>
      <div className="stack">
        {isPlaybackMode ? (
          <PlaybackBar
            currentIndex={moveIndex}
            totalMoves={moveCount}
            onGoBack={goBack}
            onGoForward={goForward}
            onGoToStart={goToStart}
            onGoToEnd={goToEnd}
            onContinue={handleContinue}
          />
        ) : (
          <CommandBar {...{ canback, back, restart }} />
        )}
      </div>
    </div>
  );
};

export default Board;
