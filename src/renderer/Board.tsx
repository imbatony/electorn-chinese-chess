import * as React from 'react';
import { useCallback, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';

import { FEN } from '../common/Fen';
import { GAME_RECORD_VERSION, GameRecord, MoveEntry } from '../common/GameRecord';
import { PointsToICCS } from '../common/ICCS';

import { event } from './Event';
import { ChessBoard } from './components/ChessBoard';
import { CommandBar } from './components/CommandBar';
import { PlaybackBar } from './components/PlaybackBar';
import { ChessContext } from './context';
import { EngineQueryTracker } from './engineQuery';
import { getRecordSides, mutationIsDirty } from './gameHistory';
import { useFEN } from './hooks';
import { PlaySide } from './types';

interface BoardProps {
  pendingRecord?: {
    record: GameRecord;
    disposition: 'clean' | 'recovery';
  };
  onRecordApplied?: () => void;
}

const Board = ({ pendingRecord, onRecordApplied }: BoardProps) => {
  const params = useParams();
  const chessCtx = React.useContext(ChessContext);
  const fenParams = params.fen;
  const rotationParm: boolean = (params.rotation ?? 'true') === 'true';
  const [rotation, setRotation] = useState(rotationParm);
  const [isDirty, setIsDirty] = useState(false);
  const loadDisposition = useRef<'clean' | 'recovery'>('clean');
  const queryTracker = useRef(new EngineQueryTracker());
  const currentPosition = useRef({ fen: '', revision: 0, turn: true });
  const queryRevision = useRef({
    fen: null as FEN | null,
    historyRevision: -1,
    isPlaybackMode: false,
    value: 0,
  });
  const {
    fen,
    push,
    back,
    canback,
    restart,
    moveIndex,
    moveCount,
    isPlaybackMode,
    initialFen,
    getFenArray,
    loadFromRecord,
    goForward,
    goBack,
    goToStart,
    goToEnd,
    continueFromPosition,
    historyRevision,
    lastMutation,
  } = useFEN(fenParams);
  if (
    queryRevision.current.fen !== fen ||
    queryRevision.current.historyRevision !== historyRevision ||
    queryRevision.current.isPlaybackMode !== isPlaybackMode
  ) {
    queryRevision.current = {
      fen,
      historyRevision,
      isPlaybackMode,
      value: queryRevision.current.value + 1,
    };
  }
  currentPosition.current = {
    fen: fen.getFenWithMove(),
    revision: queryRevision.current.value,
    turn: fen.isRedTurn(),
  };

  React.useEffect(() => {
    chessCtx.setType('board');
    return () => {
      chessCtx.updateBoardStatus(null);
    };
  }, []);

  const terminate = (red: boolean) => {
    alert(`${red ? '红' : '黑'}方胜`);
  };

  const queryEngineMove = useCallback(() => {
    const position = currentPosition.current;
    const request = queryTracker.current.start(position.fen, position.revision);
    if (!request) return;

    chessCtx
      .queryMove(request.fen, position.turn)
      .then((result) => {
        const current = currentPosition.current;
        if (!queryTracker.current.isFresh(request, current.fen, current.revision)) return;

        if (result.status === 'move') {
          console.log('move:', result.move);
          event.emit('move', result.move);
        } else if (result.status === 'error') {
          console.error('[QueryMove] Error:', result.error);
        }
      })
      .catch((error) => {
        console.error('[QueryMove] Error:', error);
      })
      .finally(() => {
        queryTracker.current.finish(request);
      });
  }, [chessCtx]);

  const callBack = React.useCallback(
    (prev: PlaySide, cur: PlaySide) => {
      // 回放模式下不触发 AI
      if (isPlaybackMode) return;

      console.log(prev, cur);
      let shouldQuery = false;
      if (prev.red != cur.red && fen.isRedTurn() && prev.red === 'human') {
        shouldQuery = true;
      } else if (prev.black != cur.black && !fen.isRedTurn() && prev.black === 'human') {
        shouldQuery = true;
      }
      if (shouldQuery) {
        queryEngineMove();
      }
    },
    [fen, isPlaybackMode, queryEngineMove]
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
    if (needquey) {
      queryEngineMove();
    }
  }, [canback, fen, moveCount, isPlaybackMode, historyRevision, queryEngineMove]);

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
    } else if (response.error !== '用户取消保存') {
      console.error('Save failed:', response.error);
      alert(`保存失败: ${response.error}`);
    }
  }, [collectGameRecord, chessCtx]);

  /**
   * 加载棋谱
   */
  const applyRecord = useCallback(
    (record: GameRecord, disposition: 'clean' | 'recovery') => {
      console.log('Loading record:', record);
      loadDisposition.current = disposition;
      loadFromRecord(record);

      // 恢复红黑方设置
      chessCtx.setSides(getRecordSides(record));
    },
    [loadFromRecord, chessCtx]
  );

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

  // 注册保存/导出回调
  React.useEffect(() => {
    chessCtx.setOnSave(handleSave);
  }, [handleSave]);

  React.useEffect(() => {
    chessCtx.setOnExport(handleExport);
  }, [handleExport]);

  React.useEffect(() => {
    if (!pendingRecord) return;
    applyRecord(pendingRecord.record, pendingRecord.disposition);
    onRecordApplied?.();
  }, [pendingRecord, applyRecord, onRecordApplied]);

  // 设置 dirty 状态检查回调
  React.useEffect(() => {
    chessCtx.setIsDirtyCallback(() => isDirty);
  }, [isDirty]);

  React.useEffect(() => {
    if (!lastMutation) return;

    if (lastMutation === 'load') {
      setIsDirty(mutationIsDirty(lastMutation, loadDisposition.current === 'recovery'));
      return;
    }

    setIsDirty(mutationIsDirty(lastMutation));
    const record = collectGameRecord();
    void chessCtx
      .autoSaveGameRecord(record)
      .then((response) => {
        if (!response.success) {
          alert(`自动保存失败: ${response.error ?? '未知错误'}`);
        }
      })
      .catch((error) => {
        alert(`自动保存失败: ${error instanceof Error ? error.message : String(error)}`);
      });
  }, [historyRevision, lastMutation, collectGameRecord, chessCtx]);

  return (
    <div className="chessboard">
      <div className="stack" style={{ paddingTop: 20 }}>
        <ChessBoard
          {...{ rotation, push, fen }}
          positionRevision={queryRevision.current.value}
        ></ChessBoard>
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
