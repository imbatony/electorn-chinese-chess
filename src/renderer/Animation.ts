import Konva from "konva";
export const ChessSelected = (shape: Konva.Image) => {
  // use Konva methods to animate a shape
  shape.to({
    scaleX: 1.2,
    scaleY: 1.2,
    duration: 0.1,
    easing: Konva.Easings.EaseIn,
    onFinish: () => {
      shape.to({
        scaleX: 1,
        scaleY: 1,
        duration: 0.1,
        easing: Konva.Easings.EaseIn,
      });
    },
  });
};

export const ChessMoving = (
  shape: Konva.Image,
  tx: number,
  ty: number,
  callback?: () => void
): void => {
  shape.to({
    x: tx,
    y: ty,
    scaleX: 1.2,
    scaleY: 1.2,
    duration: 0.2,
    easing: Konva.Easings.EaseInOut,
    onFinish: callback,
  });
};

export const ChessMoving2 = (
  shape: Konva.Image,
  tx: number,
  ty: number,
  callback?: () => void
): void => {
  shape.to({
    x: tx,
    y: ty,
    scaleX: 1.2,
    scaleY: 1.2,
    duration: 0.5,
    easing: Konva.Easings.EaseInOut,
    onFinish: callback,
  });
};
