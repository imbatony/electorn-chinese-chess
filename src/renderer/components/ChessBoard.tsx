import React, { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Stage } from 'react-konva';

import Konva from 'konva';

import { getLegalMovesFrom, hasLegalMove, isSideInCheck } from '../../common/BoardRules';
import { FEN } from '../../common/Fen';
import { validateEngineMove } from '../../common/MoveValidation';
import { PieceArray } from '../../common/Pieces';
import { ChessMoving, ChessMoving2, ChessSelected } from '../Animation';
import { event } from '../Event';
import {
  boardHeight,
  boardOffSetX,
  boardOffSetY,
  boardWith,
  chessSize,
  spaceX,
  spaceY,
  startX,
  startY,
} from '../Images';
import {
  checkedSound,
  checkingSound,
  clickSound,
  eatSound,
  goErrorSound,
  selectSound,
} from '../Sound';
import { boardSquareToPiecePixel, pixelToBoardSquare } from '../boardCoordinates';
import { ChessContext } from '../context';
import { PositionIdentity, isSamePosition } from '../engineQuery';
import { usePosition } from '../hooks';
import { ChessBoradBG } from './ChessBoradBG';
import { HintLayer } from './HintLayer';
import { OperationLayer } from './OperationLayer';
import { PiecesLayer } from './PiecesLayer';

interface ChessBoardProps {
  fen: FEN;
  positionRevision: number;
  rotation: boolean;
  push: (x: number, y: number, tx: number, ty: number) => void;
}

interface PendingEngineMove {
  id: number;
  sourcePosition: PositionIdentity;
  points: [number, number, number, number];
  endX: number;
  endY: number;
  checking: boolean;
  captured: boolean;
}

export const ChessBoard = React.memo(({ rotation, fen, positionRevision }: ChessBoardProps) => {
  console.log('render ChessBoard');
  const chessCtx = React.useContext(ChessContext);
  const board = fen.getChessArray();
  const turn = fen.isRedTurn();
  const lastMove = fen.getLastMove();
  const [select, setSelect] = usePosition(-1, -1);
  const [opSelect, setOpSelect] = usePosition(-1, -1);
  const chessRef = useRef<Konva.Image>(null);
  const opChessRef = useRef<Konva.Image>(null);
  const selectionAnimationPending = useRef(false);
  const [pendingEngineMove, setPendingEngineMove] = useState<PendingEngineMove | null>(null);
  const engineMoveInFlight = useRef<number>();
  const nextEngineMoveId = useRef(0);
  const committedEngineMoveId = useRef<number>();
  const currentPositionKey = fen.getFen();
  const currentPosition = useRef<PositionIdentity>({
    key: currentPositionKey,
    revision: positionRevision,
  });
  currentPosition.current = {
    key: currentPositionKey,
    revision: positionRevision,
  };
  const selected = useMemo<boolean>(() => {
    return (
      select.x >= 0 &&
      select.y >= 0 &&
      board[select.y][select.x] > 0 &&
      PieceArray[board[select.y][select.x] - 1].IsRed() === turn
    );
  }, [board, select, turn]);

  const availableMovement = useMemo<Array<[number, number]>>(() => {
    if (!selected) {
      return [];
    } else {
      return getLegalMovesFrom(board, select.x, select.y, turn);
    }
  }, [board, select, selected, turn]);

  useLayoutEffect(() => {
    if (!selectionAnimationPending.current) {
      return;
    }
    selectionAnimationPending.current = false;
    if (chessRef.current) {
      ChessSelected(chessRef.current);
    }
  });

  const onMove = useCallback(
    (move: string) => {
      console.log('onMove');
      const validation = validateEngineMove(move, fen);
      if (!validation.valid) {
        console.warn(
          'Engine returned invalid move, skipped:',
          move,
          'reason' in validation ? validation.reason : ''
        );
        goErrorSound.play();
        return;
      }
      if (engineMoveInFlight.current !== undefined) {
        console.warn('Engine move skipped while another engine move is animating:', move);
        return;
      }
      const [x, y, tx, ty] = validation.points;
      const nextFen = validation.nextFen;
      const target = boardSquareToPiecePixel(
        tx,
        ty,
        rotation,
        { startX, startY, spaceX, spaceY },
        chessSize
      );
      console.log('nextFen:', x, y, tx, ty);
      const id = ++nextEngineMoveId.current;
      engineMoveInFlight.current = id;
      setOpSelect(x, y);
      setPendingEngineMove({
        id,
        sourcePosition: { ...currentPosition.current },
        points: validation.points,
        endX: target.x,
        endY: target.y,
        checking: isSideInCheck(nextFen.getChessArray(), !fen.isRedTurn()),
        captured: board[ty][tx] !== 0,
      });
    },
    [board, fen, rotation, setOpSelect]
  );

  const clearPendingEngineMove = useCallback(
    (id: number) => {
      if (engineMoveInFlight.current === id) {
        engineMoveInFlight.current = undefined;
        setOpSelect(-1, -1);
      }
      setPendingEngineMove((current) => (current?.id === id ? null : current));
    },
    [setOpSelect]
  );

  useLayoutEffect(() => {
    if (!pendingEngineMove) {
      return;
    }

    const { id, sourcePosition } = pendingEngineMove;
    if (!isSamePosition(sourcePosition, currentPosition.current)) {
      clearPendingEngineMove(id);
      return;
    }

    const shape = opChessRef.current;
    if (!shape) {
      console.error('Engine move animation source was not committed');
      clearPendingEngineMove(id);
      goErrorSound.play();
      return;
    }

    let cancelled = false;
    let finished = false;
    const { points, endX, endY, checking, captured } = pendingEngineMove;
    const [x, y, tx, ty] = points;
    const animation = ChessMoving2(shape, endX, endY, () => {
      if (cancelled || committedEngineMoveId.current === id) {
        return;
      }
      finished = true;
      if (!isSamePosition(sourcePosition, currentPosition.current)) {
        clearPendingEngineMove(id);
        return;
      }
      committedEngineMoveId.current = id;
      clearPendingEngineMove(id);
      console.log('chess moving done');
      if (checking) {
        checkedSound.play();
      } else if (captured) {
        console.log('eat tx', tx, 'ty', ty);
        eatSound.play();
      } else {
        clickSound.play();
      }
      event.emit('newmove', x, y, tx, ty);
    });

    return () => {
      cancelled = true;
      if (!finished) {
        animation.cancel();
        if (!isSamePosition(sourcePosition, currentPosition.current)) {
          clearPendingEngineMove(id);
        }
      }
    };
  }, [clearPendingEngineMove, currentPositionKey, pendingEngineMove, positionRevision]);

  React.useEffect(() => {
    return () => {
      engineMoveInFlight.current = undefined;
    };
  }, []);

  React.useEffect(() => {
    event.addListener('move', onMove);
    return () => {
      event.removeListener('move', onMove);
    };
  }, [onMove]);

  const notifiedTerminalPosition = useRef<string>();
  React.useEffect(() => {
    let terminalWinner: boolean | null = null;
    if (!hasLegalMove(board, false)) {
      terminalWinner = true;
    } else if (!hasLegalMove(board, true)) {
      terminalWinner = false;
    }
    if (terminalWinner === null) {
      notifiedTerminalPosition.current = undefined;
      return;
    }
    const positionKey = fen.getFen();
    if (notifiedTerminalPosition.current === positionKey) {
      return;
    }
    const timer = window.setTimeout(() => {
      notifiedTerminalPosition.current = positionKey;
      event.emit('terminate', terminalWinner);
    }, 500);
    return () => window.clearTimeout(timer);
  }, [board, fen]);

  const actionable = useMemo(() => {
    if (fen.isRedTurn()) {
      return chessCtx.redSide === 'human';
    } else {
      return chessCtx.blackSide === 'human';
    }
  }, [fen]);

  const clickBoard = React.useCallback(
    (evt: Konva.KonvaEventObject<MouseEvent>) => {
      if (!actionable) {
        goErrorSound.play();
        return;
      }
      const square = pixelToBoardSquare(evt.evt.offsetX, evt.evt.offsetY, rotation, {
        startX,
        startY,
        spaceX,
        spaceY,
      });
      if (!square) {
        goErrorSound.play();
        return;
      }
      const { x, y, displayY: positionY } = square;
      if (selected && availableMovement.filter(([ax, ay]) => ax == x && ay == y).length === 1) {
        const endX = x * spaceX + startX - chessSize / 2;
        const endY = positionY * spaceY + startY - chessSize / 2;
        const nextFen = FEN.UpdateFen(fen, select.x, select.y, x, y);
        const checking = isSideInCheck(nextFen.getChessArray(), !turn);
        const checkmate = !hasLegalMove(nextFen.getChessArray(), !turn);

        ChessMoving(chessRef.current, endX, endY, () => {
          if (checkmate) {
            //将死对方不播放声音
          } else if (checking) {
            checkingSound.play();
          } else if (board[y][x] !== 0) {
            console.log('eat x', x, 'y', y, board);
            eatSound.play();
          } else {
            clickSound.play();
          }
          console.log('push', select.x, ',', select.y, '->', x, ',', y);
          event.emit('newmove', select.x, select.y, x, y);
          setSelect(-1, -1);
        });
        return;
      }
      if (board[y][x] > 0) {
        const c = PieceArray[board[y][x] - 1];
        if (c.IsRed() === turn) {
          selectionAnimationPending.current = true;
          selectSound.play();
        }
      }
      setSelect(x, y);
    },
    [selected, availableMovement, select, actionable, fen, rotation, setSelect, turn, board]
  );

  return (
    <Stage width={boardWith + boardOffSetX} height={boardHeight + boardOffSetY}>
      <ChessBoradBG />
      <PiecesLayer
        chessRef={chessRef}
        opChessRef={opChessRef}
        board={board}
        rotation={rotation}
        select={select}
        opSelect={opSelect}
        lastMove={lastMove}
      />
      <HintLayer
        board={board}
        rotation={rotation}
        select={select}
        selected={selected}
        lastMove={lastMove}
        availableMovement={availableMovement}
      ></HintLayer>
      <OperationLayer clickBoard={clickBoard} />
    </Stage>
  );
});
