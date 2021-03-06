
import { boardHeight, boardWith, boardOffSetX, boardOffSetY, spaceX, spaceY, startX, startY, chessSize } from '../Images';
import Konva from 'konva';
import { Stage } from 'react-konva';
import React, { useMemo, useRef } from 'react';
import { ChessBoradBG } from './ChessBoradBG';
import { PiecesLayer } from './PiecesLayer';
import { HintLayer } from './HintLayer';
import { OperationLayer } from './OperationLayer';
import { PieceArray } from '../../common/Pieces';
import { FEN } from '../../common/Fen';
import { ChessSelected, ChessMoving, ChessMoving2 } from '../Animation';
import { clickSound, selectSound, eatSound, checkingSound, goErrorSound, checkedSound } from '../Sound';
import { event } from '../Event';
import { ICCSToPoints } from '../../common/ICCS';
import { usePosition } from '../hooks';
import { ChessContext } from '../context';
interface ChessBoardProps {
    fen: FEN,
    rotation: boolean,
    push: (x: number, y: number, tx: number, ty: number) => void
}

export const ChessBoard = React.memo(({ rotation, fen }: ChessBoardProps) => {
    console.log("render ChessBoard")
    const chessCtx = React.useContext(ChessContext)
    const board = fen.getChessArray();
    const turn = fen.isRedTurn();
    const lastMove = fen.getLastMove();
    const [select, setSelect] = usePosition(-1, -1);
    const [opSelect, setOpSelect] = usePosition(-1, -1);
    const chessRef = useRef(null);
    const opChessRef = useRef(null);
    const selected = useMemo<boolean>(() => {
        return select.x >= 0 && select.y >= 0 && board[select.y][select.x] > 0 && PieceArray[board[select.y][select.x] - 1].IsRed() === turn
    }, [select])

    const availableMovement = useMemo<Array<[number, number]>>(() => {
        if (!selected) {
            return [];
        } else {
            return PieceArray[board[select.y][select.x] - 1].GetAvailableMovement(select.x, select.y, board, PieceArray)
        }
    }, [select, selected])

    const onMove = (move: string) => {
        console.log("onMove")
        // ...
        const ICCS = move;
        const [x, y, tx, ty] = ICCSToPoints(ICCS)
        const endX = x * spaceX + startX - chessSize / 2;
        const endY = (rotation ? y : 9 - y) * spaceY + startY - chessSize / 2;
        const nextFen = FEN.UpdateFen(fen, x, y, tx, ty);
        console.log("nextFen:", x, y, tx, ty)
        setOpSelect(x, y);
        ChessMoving2(opChessRef.current, endX, endY, () => {
            console.log("chess moving done")
            const checking = nextFen.isChecking(fen.isRedTurn());
            if (checking) {
                checkedSound.play()
            }
            else if (board[ty][tx] !== 0) {
                console.log("eat tx", tx, "ty", ty, board)
                eatSound.play();
            } else {
                clickSound.play();
            }
            event.emit("newmove", x, y, tx, ty);
        })
    }
    if (fen.isCheckmate(true)) {
        setTimeout(() => {
            event.emit("terminate", true);
        }, 500);

    }
    if (fen.isCheckmate(false)) {
        setTimeout(() => {
            event.emit("terminate", false);
        }, 500);
    }
    React.useEffect(() => {
        event.addListener('move', onMove)
        return () => {
            event.removeListener('move', onMove)
        }
    }, [fen])


    const actionable = useMemo(() => {
        if (fen.isRedTurn()) {
            return chessCtx.redSide === 'human'
        } else {
            return chessCtx.blackSide === 'human'
        }
    }, [fen])

    const clickBoard = React.useCallback((evt: Konva.KonvaEventObject<MouseEvent>) => {
        if (!actionable) {
            goErrorSound.play();
            return;
        }
        const x = Math.ceil((evt.evt.offsetX - startX - spaceX / 2) / spaceX)
        let y = Math.ceil((evt.evt.offsetY - startY - spaceY / 2) / spaceY)
        const positionY = y;
        if (!rotation) {
            y = 9 - y;
        }
        if (selected && availableMovement.filter(([ax, ay]) => ax == x && ay == y).length === 1) {
            const endX = x * spaceX + startX - chessSize / 2;
            const endY = positionY * spaceY + startY - chessSize / 2;
            const nextFen = FEN.UpdateFen(fen, select.x, select.y, x, y);
            if (nextFen.isChecking(!turn) || nextFen.isKingFacing()) {
                //?????????????????????????????????????????????
                goErrorSound.play();
                return;
            }

            const checking = nextFen.isChecking(turn);
            const checkmate = nextFen.isCheckmate(turn);

            ChessMoving(chessRef.current, endX, endY, () => {
                if (checkmate) {
                    //???????????????????????????
                }
                else if (checking) {
                    checkingSound.play()
                }
                else if (board[y][x] !== 0) {
                    console.log("eat x", x, "y", y, board)
                    eatSound.play();
                } else {
                    clickSound.play();
                }
                console.log('push', select.x, ",", select.y, "->", x, ",", y)
                event.emit("newmove", select.x, select.y, x, y);
                setSelect(-1, -1);
            })
            return;
        }
        setSelect(x, y);
        if (chessRef.current) {
            ChessSelected(chessRef.current)
        }
        if (board[y][x] > 0) {
            const c = PieceArray[board[y][x] - 1];
            if (c.IsRed() === turn) {
                selectSound.play();
            }
        }
    }, [selected, availableMovement, select,actionable])

    return (
        <Stage width={boardWith + boardOffSetX} height={boardHeight + boardOffSetY}>
            <ChessBoradBG />
            <PiecesLayer chessRef={chessRef} opChessRef={opChessRef} board={board} rotation={rotation} select={select} opSelect={opSelect} lastMove={lastMove} />
            <HintLayer board={board} rotation={rotation} select={select} selected={selected} lastMove={lastMove}  availableMovement={availableMovement}></HintLayer>
            <OperationLayer clickBoard={clickBoard} />
        </Stage>)
})