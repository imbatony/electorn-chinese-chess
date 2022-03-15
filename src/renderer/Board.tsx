import * as React from 'react';
import { useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { FEN } from '../common/Fen';
import { ICCSToPoints } from '../common/ICCS';
import { ChessMoving } from './Animation';
import { clickSound, eatSound, checkedSound, winSound, loseSound } from './Sound';
import { spaceX, spaceY, startX, startY, chessSize } from './Images';
import { ChessContext } from './context'
import { useFEN, usePosition } from './hooks';
import { ChessBoard } from './components/ChessBoard';
import { event } from './Event';
const Board = () => {
    const params = useParams();
    const chessCtx = React.useContext(ChessContext)
    const fenParams = params.fen;
    const playerColor: boolean = (params.red ?? 'true') === 'true';
    const rotationParm: boolean = (params.red ?? 'true') === 'true';
    const [rotation, setRotation] = useState(rotationParm);
    const {fen, push, back, canback, restart } = useFEN(fenParams)

    React.useEffect(() => {
        chessCtx.setType('board')
    }, [])

    const win = () => {
        winSound.play();
        alert("你赢了!")
    }

    const lose = () => {
        loseSound.play();
        alert("你输了!")
    }

    React.useEffect(() => {
        event.addListener("win", win);
        event.addListener("lose", lose);
        return () => {
            event.removeListener("win", win);
            event.removeListener("lose", lose);
        }
    }, [])

    React.useEffect(() => {
        console.log('updateBoardStatus',canback,fen)
        chessCtx.updateBoardStatus({ canBack: canback, isEnd: false, curFen: fen.getFenWithMove() })
        if (fen.isRedTurn() !== playerColor) {
            chessCtx.queryMove(fen.getFenWithMove())
                .then((move) => {
                    console.log("move:", move)
                    event.emit("move", move);
                })
        }
    }, [canback, fen])
    
    React.useEffect(() => {
        event.removeAllListeners('newmove');
        event.addListener("newmove",push)
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
            <ChessBoard {...{ rotation, push, fen, playerColor }}></ChessBoard>
        </div>
    </div>
}

export default Board;