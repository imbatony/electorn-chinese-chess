export interface BoardGeometry {
  startX: number;
  startY: number;
  spaceX: number;
  spaceY: number;
}

export interface BoardSquare {
  x: number;
  y: number;
  displayY: number;
}

export interface PixelPosition {
  x: number;
  y: number;
}

export function boardSquareToPiecePixel(
  x: number,
  y: number,
  rotation: boolean,
  geometry: BoardGeometry,
  pieceSize: number
): PixelPosition {
  return {
    x: x * geometry.spaceX + geometry.startX - pieceSize / 2,
    y: (rotation ? y : 9 - y) * geometry.spaceY + geometry.startY - pieceSize / 2,
  };
}

export function pixelToBoardSquare(
  offsetX: number,
  offsetY: number,
  rotation: boolean,
  geometry: BoardGeometry
): BoardSquare | null {
  const rawX = Math.ceil((offsetX - geometry.startX - geometry.spaceX / 2) / geometry.spaceX);
  const rawDisplayY = Math.ceil(
    (offsetY - geometry.startY - geometry.spaceY / 2) / geometry.spaceY
  );
  if (rawX < 0 || rawX > 8 || rawDisplayY < 0 || rawDisplayY > 9) {
    return null;
  }
  const x = rawX === 0 ? 0 : rawX;
  const displayY = rawDisplayY === 0 ? 0 : rawDisplayY;

  return {
    x,
    y: rotation ? displayY : 9 - displayY,
    displayY,
  };
}
