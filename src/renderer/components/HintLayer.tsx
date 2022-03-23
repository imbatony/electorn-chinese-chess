import * as React from 'react';
import { Layer, Image } from 'react-konva';
import { Position } from '../types';
import { waySpaceY, waySpaceX, WaypointImage, RedBoxImage, spaceX, spaceY, startX, startY, chessSize, DotImage, DotImageOffsetX, DotImageOffsetY } from '../Images';
interface HintLayerProps {
    board: readonly (readonly number[])[]
    rotation: boolean,
    select: Position,
    selected: boolean,
    lastMove: [fx: number, fy: number, tx: number, ty: number],
    availableMovement: Array<[number, number]>,
}
export const HintLayer = React.memo(({ select, board, lastMove, rotation, selected, availableMovement }: HintLayerProps) => {
    const showSelect = select.x >= 0 && select.y >= 0 && board[select.y][select.x] > 0 
    const showWayPoint = lastMove[0] != -1 && lastMove[1] != -1 && lastMove[2] != -1 && lastMove[3] != -1
    return (
        <Layer>
            {showSelect ? <Image image={RedBoxImage} x={select.x * spaceX + startX - chessSize / 2} y={(rotation ? select.y : 9 - select.y) * spaceY + startY - chessSize / 2} /> : null}
            {selected ? availableMovement.map(([x, y], i) => <Image key={i} image={DotImage} x={x * spaceX + startX - DotImageOffsetX} y={(rotation ? y : 9 - y) * spaceY + startY - DotImageOffsetY} />) : null}
            {showWayPoint ? <Image image={WaypointImage} x={lastMove[0] * spaceX + startX - waySpaceX / 2} y={(rotation ? lastMove[1] : 9 - lastMove[1]) * spaceY + startY - waySpaceY / 2} /> : null}
        </Layer>
    );
});