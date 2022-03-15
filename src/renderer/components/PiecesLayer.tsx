import * as React from 'react';
import { Layer, Image } from 'react-konva';
import { Position } from '../types';
import { spaceX, startX, chessSize, spaceY, startY, ChessImageArray } from '../Images';
import { ImageConfig } from "konva/lib/shapes/Image";

interface PiecesLayerProps {
    board: readonly (readonly number[])[]
    rotation: boolean,
    select: Position,
    opSelect: Position,
    lastMove: [fx: number, fy: number, tx: number, ty: number],
    chessRef:React.MutableRefObject<any>,
    opChessRef:React.MutableRefObject<any>
}

export const PiecesLayer = React.memo((props: PiecesLayerProps) => {
    return (
        <Layer>
            {props.board.flatMap((l, y) => {
                return l.map((e, x) => {
                    // console.log(e)
                    if (e > 0) {
                        const imageX = x * spaceX + startX - chessSize / 2;
                        const imageY = (props.rotation ? y : 9 - y) * spaceY + startY - chessSize / 2;
                        let shawdow = false;
                        if (x == props.lastMove[2] && y === props.lastMove[3]) {
                            shawdow = true;
                        }
                        const image: ImageConfig = { key: `${x}_${y}`, image: ChessImageArray[e - 1], x: imageX, y: imageY };
                        if (shawdow) {
                            image.shadowBlur = 10;
                            image.shadowColor = 'white',
                                image.shadowOpacity = 0.8
                        }
                        if (x == props.select.x && y == props.select.y) {
                            image.ref = props.chessRef;
                            return <Image {...image}></Image>

                        }
                        else if (x == props.opSelect.x && y == props.opSelect.y) {
                            image.ref = props.opChessRef;
                            return <Image {...image}></Image>
                        }
                        else {
                            return <Image {...image}></Image>
                        }
                    }
                    else {
                        return null;
                    }
                })
            })}
        </Layer>
    );
});