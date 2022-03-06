const codes = ["a", "b", "c", "d", "e", "f", "g", "h", "i"];

export function ICCSToPoints(ICCS: string) {
  const x = ICCS.charCodeAt(0) - "a".charCodeAt(0);
  const y = 9 - (ICCS.charCodeAt(1) - "0".charCodeAt(0));
  const tx = ICCS.charCodeAt(2) - "a".charCodeAt(0);
  const ty = 9 - (ICCS.charCodeAt(3) - "0".charCodeAt(0));
  return [x, y, tx, ty];
}

export function PointsToICCS(x: number, y: number, tx: number, ty: number) {
  return `${codes[x]}${9 - y}${codes[tx]}${9 - ty}`;
}
