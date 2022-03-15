import Konva from 'konva';
import * as React from 'react';
import { Layer, Rect } from 'react-konva';
import { boardHeight, boardWith, boardOffSetX, boardOffSetY } from '../Images';
interface OperationLayerProps {
    clickBoard: (evt: Konva.KonvaEventObject<MouseEvent>) => void
}
export const OperationLayer = React.memo((props: OperationLayerProps) => {
    return (
        <Layer>
            <Rect width={boardWith + boardOffSetX} height={boardHeight + boardOffSetY} onClick={props.clickBoard} _useStrictMode />
        </Layer>
    );
});