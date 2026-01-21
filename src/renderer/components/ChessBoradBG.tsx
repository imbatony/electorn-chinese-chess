import React from 'react';
import { Image, Layer } from 'react-konva';

import { BGImage, boardOffSetX, boardOffSetY } from '../Images';

export const ChessBoradBG = React.memo(() => {
  return (
    <Layer>
      <Image image={BGImage} x={boardOffSetX} y={boardOffSetY} />
    </Layer>
  );
});
