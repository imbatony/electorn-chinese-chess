import { Position } from "../types";
import { useState, useMemo, useCallback } from "react";
import { FEN } from "../../common/Fen";

export function usePosition(
  x: number,
  y: number
): [Position, (x: number, y: number) => void] {
  const [position, setPosition] = useState<Position>({ x: x, y: y });
  const setPoint = function (x: number, y: number) {
    setPosition({ x: x, y: y });
  };
  return [position, setPoint];
}

export function useFEN(fenParam: string): {
  fen: FEN;
  push: (x: number, y: number, tx: number, ty: number) => void;
  back: () => void;
  canback: boolean;
  restart: () => void;
} {
  const fenInit = new FEN(fenParam);
  const [fenArray, setFenArray] = useState([fenInit]);
  const [index, setIndex] = useState(0);

  const fen = useMemo(() => {
    console.log("compute fen, index=",index)
    const fen = fenArray[index];
    return fen;
  }, [index]);

  const canback = useMemo(() => {
    return index > 1;
  }, [index]);

  const push = useCallback(
    (x: number, y: number, tx: number, ty: number) => {
      console.log('push:current index',index);
      const newFen = FEN.UpdateFen(fen, x, y, tx, ty);
      console.log("new fen:", newFen.getFen());
      fenArray[index + 1] = newFen;
      setIndex(index + 1);
    },
    [index, fen]
  );

  const back = useCallback(() => {
    if (canback) {
      console.log("back to", index - 2);
      setIndex(index - 2);
    }
  }, [index, fen]);

  const restart = useCallback(() => {
    if (canback) {
      console.log("back to", 0);
      setIndex(0);
    }
  }, [index, fen]);

  return {
    fen,
    push,
    back,
    canback,
    restart,
  };
}
