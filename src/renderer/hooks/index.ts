import { useCallback, useMemo, useState } from 'react';

import { FEN } from '../../common/Fen';
import { DEFAULT_INITIAL_FEN, GameRecord } from '../../common/GameRecord';
import {
  HistoryMutation,
  continueHistory,
  loadHistory,
  restartHistory,
  snapshotHistory,
} from '../gameHistory';
import { Position } from '../types';

export function usePosition(x: number, y: number): [Position, (x: number, y: number) => void] {
  const [position, setPosition] = useState<Position>({ x: x, y: y });
  const setPoint = useCallback((x: number, y: number) => {
    setPosition({ x: x, y: y });
  }, []);
  return [position, setPoint];
}

export interface UseFENResult {
  fen: FEN;
  push: (x: number, y: number, tx: number, ty: number) => void;
  back: () => void;
  canback: boolean;
  restart: () => void;
  /** 当前着法索引 (0 = 初始局面) */
  moveIndex: number;
  /** 着法总数 */
  moveCount: number;
  /** 是否处于回放模式 */
  isPlaybackMode: boolean;
  /** 初始 FEN */
  initialFen: string;
  /** 获取完整的 FEN 数组 (用于保存) */
  getFenArray: () => FEN[];
  /** 从 GameRecord 加载 */
  loadFromRecord: (record: GameRecord) => void;
  /** 跳转到指定着法 */
  goToMove: (index: number) => void;
  /** 下一步 */
  goForward: () => void;
  /** 上一步 */
  goBack: () => void;
  /** 跳到开始 */
  goToStart: () => void;
  /** 跳到结束 */
  goToEnd: () => void;
  /** 退出回放模式，从当前位置继续对局 */
  continueFromPosition: () => void;
  /** 设置回放模式 */
  setPlaybackMode: (mode: boolean) => void;
  historyRevision: number;
  lastMutation: HistoryMutation;
}

export function useFEN(fenParam?: string): UseFENResult {
  const fenInit = new FEN(fenParam);
  // 保持原有的可变数组引用，不使用 setState 来更新它
  const [fenArray] = useState<FEN[]>([fenInit]);
  const [index, setIndex] = useState(0);
  const [isPlaybackMode, setPlaybackModeState] = useState(false);
  const [initialFen, setInitialFen] = useState(fenParam || DEFAULT_INITIAL_FEN);
  // 使用 ref 来跟踪数组长度变化，用于触发 moveCount 重新计算
  const [arrayVersion, setArrayVersion] = useState(0);
  const [lastMutation, setLastMutation] = useState<HistoryMutation>(null);

  const fen = useMemo(() => {
    console.log('compute fen, index=', index);
    const fen = fenArray[index];
    return fen;
  }, [index, arrayVersion]);

  const canback = useMemo(() => {
    return index > 1;
  }, [index]);

  const moveCount = useMemo(() => {
    return fenArray.length - 1; // 减去初始局面
  }, [arrayVersion]);

  const push = useCallback(
    (x: number, y: number, tx: number, ty: number) => {
      // 在回放模式下不允许走棋
      if (isPlaybackMode) {
        console.log('In playback mode, cannot push moves');
        return;
      }
      console.log('push:current index', index);
      const newFen = FEN.UpdateFen(fen, x, y, tx, ty);
      console.log('new fen:', newFen.getFen());
      // 保持原有的直接修改数组的方式
      fenArray[index + 1] = newFen;
      // 截断之后的历史（如果有的话）
      fenArray.length = index + 2;
      setIndex(index + 1);
      setLastMutation('move');
      setArrayVersion((v) => v + 1);
    },
    [index, fen, isPlaybackMode]
  );

  const back = useCallback(() => {
    if (canback) {
      const targetIndex = index - 2;
      console.log('back to', targetIndex);
      fenArray.length = targetIndex + 1;
      setIndex(targetIndex);
      setLastMutation('undo');
      setArrayVersion((v) => v + 1);
    }
  }, [index, canback]);

  const restart = useCallback(() => {
    const next = restartHistory(initialFen);
    fenArray.splice(0, fenArray.length, ...next.fenArray);
    setInitialFen(next.initialFen);
    setIndex(next.index);
    setPlaybackModeState(next.isPlaybackMode);
    setLastMutation('restart');
    setArrayVersion((v) => v + 1);
  }, [initialFen]);

  const getFenArray = useCallback(() => {
    return snapshotHistory(fenArray);
  }, [arrayVersion]);

  const loadFromRecord = useCallback((record: GameRecord) => {
    console.log('Loading game record with', record.moves.length, 'moves');
    const next = loadHistory(record);
    fenArray.splice(0, fenArray.length, ...next.fenArray);
    setInitialFen(next.initialFen);
    setIndex(next.index);
    setPlaybackModeState(next.isPlaybackMode);
    setLastMutation('load');
    setArrayVersion((v) => v + 1);
  }, []);

  const goToMove = useCallback(
    (targetIndex: number) => {
      if (targetIndex >= 0 && targetIndex < fenArray.length) {
        setIndex(targetIndex);
      }
    },
    [arrayVersion]
  );

  const goForward = useCallback(() => {
    if (index < fenArray.length - 1) {
      setIndex(index + 1);
    }
  }, [index, arrayVersion]);

  const goBack = useCallback(() => {
    if (index > 0) {
      setIndex(index - 1);
    }
  }, [index]);

  const goToStart = useCallback(() => {
    setIndex(0);
  }, []);

  const goToEnd = useCallback(() => {
    setIndex(fenArray.length - 1);
  }, [arrayVersion]);

  const continueFromPosition = useCallback(() => {
    const next = continueHistory({ fenArray, index, initialFen, isPlaybackMode });
    fenArray.splice(0, fenArray.length, ...next.fenArray);
    setPlaybackModeState(next.isPlaybackMode);
    setLastMutation('continue');
    setArrayVersion((v) => v + 1);
  }, [index, initialFen, isPlaybackMode]);

  const setPlaybackMode = useCallback((mode: boolean) => {
    setPlaybackModeState(mode);
  }, []);

  return {
    fen,
    push,
    back,
    canback,
    restart,
    moveIndex: index,
    moveCount,
    isPlaybackMode,
    initialFen,
    getFenArray,
    loadFromRecord,
    goToMove,
    goForward,
    goBack,
    goToStart,
    goToEnd,
    continueFromPosition,
    setPlaybackMode,
    historyRevision: arrayVersion,
    lastMutation,
  };
}
