import * as React from 'react';
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { ChessContext } from './context'
import { useFEN } from './hooks';
import { ChessBoard } from './components/ChessBoard';
import { event } from './Event';
import { CommandBar } from './components/CommandBar';
import { PlaySide } from './types';

const Board = () => {
    const params = useParams();
    const chessCtx = React.useContext(ChessContext)
    const fenParams = params.fen;
    const rotationParm: boolean = (params.rotation ?? 'true') === 'true';
    const [rotation, setRotation] = useState(rotationParm);
    const { fen, push, back, canback, restart } = useFEN(fenParams)

    React.useEffect(() => {
        chessCtx.setType('board');
    }, [])

    const terminate = (red: boolean) => {
        alert(`${red ? "红" : "黑"}方胜`)
    }

    const callBack = React.useCallback((prev: PlaySide, cur: PlaySide) => {
        console.log(prev, cur);
        if (prev.red != cur.red && fen.isRedTurn() && prev.red === "human") {
            chessCtx.queryMove(fen.getFenWithMove(), fen.isRedTurn())
                .then((move) => {
                    console.log("move:", move)
                    event.emit("move", move);
                })
        }
        else if (prev.black != cur.black && !fen.isRedTurn() && prev.black === "human") {
            chessCtx.queryMove(fen.getFenWithMove(), fen.isRedTurn())
                .then((move) => {
                    console.log("move:", move)
                    event.emit("move", move);
                })
        }
    }, [fen])

    React.useEffect(() => {
        chessCtx.setChangeSideCallBack(callBack);
    }, [callBack])

    React.useEffect(() => {
        // event.addListener("win", win);
        // event.addListener("lose", lose);
        event.addListener("terminate", terminate);
        return () => {
            // event.removeListener("win", win);
            // event.removeListener("lose", lose);
            event.removeListener("terminate", terminate);
        }
    }, [])

    React.useEffect(() => {
        console.log('updateBoardStatus', canback, fen)
        chessCtx.updateBoardStatus({ canBack: canback, isEnd: false, curFen: fen.getFenWithMove() })
        const needquey = fen.isRedTurn() ? chessCtx.redSide !== "human" : chessCtx.blackSide !== "human";
        if (needquey) {
            chessCtx.queryMove(fen.getFenWithMove(), fen.isRedTurn())
                .then((move) => {
                    console.log("move:", move)
                    event.emit("move", move);
                })

        }
    }, [canback, fen])

    React.useEffect(() => {
        event.removeAllListeners('newmove');
        event.addListener("newmove", push);
    }, [push])

    React.useEffect(() => {
        chessCtx.setOnBack(back)
    }, [back])

    React.useEffect(() => {
        chessCtx.setOnRestart(restart)
    }, [restart])

    React.useEffect(() => {
        chessCtx.setOnRotation(() => { setRotation(!rotation) })
    }, [rotation])

    return <div className='chessboard'>
        <div className='stack' style={{ paddingTop: 20 }}>
            <ChessBoard {...{ rotation, push, fen }}></ChessBoard>
        </div>
        <div className='stack'>
            <CommandBar {...{ canback, back, restart }} />
        </div>
    </div>
}

export default Board;