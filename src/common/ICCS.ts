const codes = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i'];

export type BoardPoints = [number, number, number, number];

export function TryICCSToPoints(ICCS: string): BoardPoints | null {
  if (!/^[a-i][0-9][a-i][0-9]$/.test(ICCS)) {
    return null;
  }
  const x = ICCS.charCodeAt(0) - 'a'.charCodeAt(0);
  const y = 9 - (ICCS.charCodeAt(1) - '0'.charCodeAt(0));
  const tx = ICCS.charCodeAt(2) - 'a'.charCodeAt(0);
  const ty = 9 - (ICCS.charCodeAt(3) - '0'.charCodeAt(0));
  return [x, y, tx, ty];
}

export function ICCSToPoints(ICCS: string): BoardPoints {
  const points = TryICCSToPoints(ICCS);
  if (!points) {
    throw new Error(`Invalid ICCS move: ${ICCS}`);
  }
  return points;
}

export function PointsToICCS(x: number, y: number, tx: number, ty: number) {
  if (
    !Number.isInteger(x) ||
    !Number.isInteger(y) ||
    !Number.isInteger(tx) ||
    !Number.isInteger(ty) ||
    x < 0 ||
    x > 8 ||
    tx < 0 ||
    tx > 8 ||
    y < 0 ||
    y > 9 ||
    ty < 0 ||
    ty > 9
  ) {
    throw new RangeError('Cannot convert coordinates outside the chess board');
  }
  return `${codes[x]}${9 - y}${codes[tx]}${9 - ty}`;
}
