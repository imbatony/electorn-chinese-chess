import { BGImage, boardOffSetX, boardOffSetY } from '../Images';
import { Layer, Image } from 'react-konva';
import React from 'react';
export const ChessBoradBG = React.memo(() => {
    return (<Layer>
        <Image image={BGImage} x={boardOffSetX} y={boardOffSetY} />
    </Layer>)
});