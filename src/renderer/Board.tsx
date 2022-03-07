import { BoardStatus, BoardStatusKey } from "../common/IPCInfos";
import * as React from 'react';
import { useState, useMemo, useRef } from 'react';
const { ipcRenderer } = window.require('electron');
import { useParams } from 'react-router-dom';
import { Stage, Layer, Image, Rect } from 'react-konva';
import { FEN } from '../common/Fen';
import { PieceArray } from '../common/Pieces';
import { ICCSToPoints } from '../common/ICCS';
import { ChessSelected, ChessMoving } from './Animation';
import Konva from 'konva';
import { clickSound, selectSound, eatSound } from './Sound';
import { DotImage, BGImage, ChessImageArray, RedBoxImage, boardHeight, boardWith, boardOffSetX, boardOffSetY, spaceX, spaceY, startX, startY, redBoxSize, chessSize, DotImageOffsetX, DotImageOffsetY } from './Images';

interface Position {
    x: number,
    y: number
}
function usePosition(x: number, y: number): [Position, (x: number, y: number) => void] {
    const [position, setPosition] = useState<Position>({ x: x, y: y });
    const setPoint = function (x: number, y: number) {
        setPosition({ x: x, y: y })
    }
    return [position, setPoint];
}

function useFEN(fenParam: string): [string, boolean, readonly (readonly number[])[], (x: number, y: number, tx: number, ty: number) => void, () => void, boolean, () => void] {
    const fenInit = new FEN(fenParam);
    const [fenArray, setFenArray] = useState([fenInit]);
    const [index, setIndex] = useState(0);

    const [fen, fenStr, redTurn, chessArray] = useMemo(() => {
        const fen = fenArray[index];
        return [fen, fen.getFenWithMove(), fen.isRedTurn(), fen.getChessArray()]
    }, [index])

    const canback = useMemo(() => {
        return index > 1
    }, [index])

    const push = React.useCallback((x: number, y: number, tx: number, ty: number) => {
        console.log(index)
        const newFen = FEN.UpdateFen(fen, x, y, tx, ty);
        console.log('new fen:', newFen.getFen())
        fenArray[index + 1] = newFen;
        setIndex(index + 1);
    }, [index, fen]);

    const back = React.useCallback(() => {
        if (canback) {
            console.log('back to', index - 2);
            setIndex(index - 2);
        }
    }, [index, fen])

    const restart = React.useCallback(() => {
        if (canback) {
            console.log('back to', 0);
            setIndex(0);
        }
    }, [index, fen])
    return [fenStr, redTurn, chessArray, push, back, canback, restart]
}

const Board = () => {
    const params = useParams();
    const difficulty = params.difficulty;
    const fenParams = params.fen;
    const red: boolean = (params.red ?? 'true') === 'true';
    const [fenStr, turn, board, push, back, canback, restart] = useFEN(fenParams)

    const [mouseMove, setMouseMove] = usePosition(-1, -1);
    const [select, setSelect] = usePosition(-1, -1);
    const [opSelect, setOpSelect] = usePosition(-1, -1);
    const chessRef = useRef(null);
    const opChessRef = useRef(null);
    const selected = useMemo<boolean>(() => {
        return select.x >= 0 && select.y >= 0 && board[select.y][select.x] > 0 && PieceArray[board[select.y][select.x] - 1].IsRed() === turn
    }, [turn, fenStr, select])

    const availableMovement = useMemo<Array<[number, number]>>(() => {
        if (!selected) {
            return [];
        } else {
            return PieceArray[board[select.y][select.x] - 1].GetAvailableMovement(select.x, select.y, board, PieceArray)
        }
    }, [turn, fenStr, select, selected])

    ipcRenderer.on('op:back', () => {
        console.log('op:back')
        back();
    })
    ipcRenderer.on('op:restart', () => {
        console.log('op:restart')
        restart();
    })
    React.useEffect(() => {
        if (turn !== red) {
            // 渲染进程
            console.log(fenStr);
            ipcRenderer.invoke('queryMove', fenStr).then((move) => {
                console.log("move:", move)
                // ...
                const ICCS = move;
                const [x, y, tx, ty] = ICCSToPoints(ICCS)
                const endX = x * spaceX + startX - chessSize / 2;
                const endY = y * spaceY + startY - chessSize / 2;
                console.log(x, y, tx, ty)
                setOpSelect(x, y);
                setTimeout(() => {
                    ChessMoving(opChessRef.current, endX, endY, () => {
                        if (board[ty][tx] !== 0) {
                            eatSound.play();
                        } else {
                            clickSound.play();
                        }
                        push(x, y, tx, ty);
                    })
                }, 500);
            })
        }
        const boardStatus: BoardStatus = { canBack: canback, isEnd: false, curFen: fenStr };
        ipcRenderer.invoke(BoardStatusKey, boardStatus)
    }, [turn, fenStr])

    const clickBoard = (evt: Konva.KonvaEventObject<MouseEvent>) => {
        // console.log(evt)
        // console.log(evt.evt.offsetX)
        // console.log(evt.evt.offsetY)
        const x = Math.ceil((evt.evt.offsetX - startX - spaceX / 2) / spaceX)
        const y = Math.ceil((evt.evt.offsetY - startY - spaceY / 2) / spaceY)
        if (selected && availableMovement.filter(([ax, ay]) => ax == x && ay == y).length === 1) {
            const endX = x * spaceX + startX - chessSize / 2;
            const endY = y * spaceY + startY - chessSize / 2;
            ChessMoving(chessRef.current, endX, endY, () => {
                if (board[y][x] !== 0) {
                    eatSound.play();
                } else {
                    clickSound.play();
                }
                push(select.x, select.y, x, y);
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
    }
    const showSelect = useMemo<boolean>(() => {
        return select.x >= 0 && select.y >= 0 && board[select.y][select.x] > 0 && (PieceArray[board[select.y][select.x] - 1].IsRed() === red)
    }, [select.x, select.x, board])

    const showRedBox = useMemo<boolean>(() => {
        //disableRedBox
        return mouseMove.x >= 0 && mouseMove.y >= 0 && false
    }, [mouseMove.x, mouseMove.y])

    const [redBoxX, redBoxY] = useMemo<[number, number]>(() => {
        return [mouseMove.x * spaceX + startX - redBoxSize / 2, mouseMove.y * spaceY + startY - redBoxSize / 2]
    }, [mouseMove.x, mouseMove.y])

    const mouseMoveBoard = (evt: Konva.KonvaEventObject<MouseEvent>) => {
        const x = Math.ceil((evt.evt.offsetX - startX - spaceX / 2) / spaceX)
        const y = Math.ceil((evt.evt.offsetY - startY - spaceY / 2) / spaceY)
        if (x != mouseMove.x || y != mouseMove.y) {
            setMouseMove(x, y)
        }
    }

    return <div className='chessboard'>
        <div className='stack' style={{ paddingTop: 20 }}>
            <Stage width={boardWith + boardOffSetX} height={boardHeight + boardOffSetY}>
                <Layer>
                    <Image image={BGImage} x={boardOffSetX} y={boardOffSetY} />
                </Layer>
                {
                    <Layer>
                        {board.flatMap((l, y) => {
                            return l.map((e, x) => {
                                // console.log(e)
                                if (e > 0) {
                                    if (x == select.x && y == select.y) {
                                        return <Image key={`${x}_${y}`} ref={chessRef} image={ChessImageArray[e - 1]} x={x * spaceX + startX - chessSize / 2} y={y * spaceY + startY - chessSize / 2} ></Image>
                                    }
                                    else if (x == opSelect.x && y == opSelect.y) {
                                        return <Image key={`${x}_${y}`} ref={opChessRef} image={ChessImageArray[e - 1]} x={x * spaceX + startX - chessSize / 2} y={y * spaceY + startY - chessSize / 2} ></Image>
                                    }
                                    else {
                                        return <Image key={`${x}_${y}`} image={ChessImageArray[e - 1]} x={x * spaceX + startX - chessSize / 2} y={y * spaceY + startY - chessSize / 2} ></Image>
                                    }
                                }
                                else {
                                    return null;
                                }
                            })
                        })}
                    </Layer>
                }
                {showSelect ? <Layer>
                    <Image image={RedBoxImage} x={select.x * spaceX + startX - chessSize / 2} y={select.y * spaceY + startY - chessSize / 2} />
                </Layer> : null}
                {showRedBox ? <Layer>
                    <Image image={RedBoxImage} x={redBoxX} y={redBoxY} />
                </Layer> : null}
                {selected ? <Layer>
                    {availableMovement.map(([x, y], i) => {
                        return <Image key={i} image={DotImage} x={x * spaceX + startX - DotImageOffsetX} y={y * spaceY + startY - DotImageOffsetY} />
                    })}

                </Layer> : null}
                <Layer>
                    <Rect width={boardWith + boardOffSetX} height={boardHeight + boardOffSetY} onMouseMove={mouseMoveBoard} onClick={clickBoard} _useStrictMode />
                </Layer>
            </Stage>
        </div>
    </div>
}
export default Board;