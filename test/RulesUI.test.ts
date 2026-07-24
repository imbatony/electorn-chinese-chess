import { FEN } from '../src/common/Fen';
import { ICCSToPoints, PointsToICCS, TryICCSToPoints } from '../src/common/ICCS';
import { validateEngineMove } from '../src/common/MoveValidation';
import { boardSquareToPiecePixel, pixelToBoardSquare } from '../src/renderer/boardCoordinates';

const geometry = { startX: 31, startY: 32, spaceX: 57, spaceY: 57 };

test('maps an engine move target square to the animation destination', () => {
  const [, , tx, ty] = ICCSToPoints('a0a1');
  expect(boardSquareToPiecePixel(tx, ty, true, geometry, 54)).toEqual({
    x: 4,
    y: 461,
  });
  expect(boardSquareToPiecePixel(tx, ty, false, geometry, 54)).toEqual({
    x: 4,
    y: 62,
  });
});

test.each([
  [true, 31, 32, { x: 0, y: 0, displayY: 0 }],
  [true, 487, 545, { x: 8, y: 9, displayY: 9 }],
  [false, 31, 32, { x: 0, y: 9, displayY: 0 }],
  [false, 487, 545, { x: 8, y: 0, displayY: 9 }],
])('maps board pixels for rotation %s', (rotation, x, y, expected) => {
  expect(pixelToBoardSquare(x as number, y as number, rotation as boolean, geometry)).toEqual(
    expected
  );
});

test.each([
  [true, -30, 32],
  [true, 550, 32],
  [true, 31, -30],
  [true, 31, 610],
  [false, -30, 32],
  [false, 550, 32],
  [false, 31, -30],
  [false, 31, 610],
])('rejects pixels outside the board for rotation %s', (rotation, x, y) => {
  expect(pixelToBoardSquare(x as number, y as number, rotation as boolean, geometry)).toBeNull();
});

test('ICCS conversion validates input and coordinates', () => {
  expect(TryICCSToPoints('a0i9')).toEqual([0, 9, 8, 0]);
  expect(TryICCSToPoints('j0a0')).toBeNull();
  expect(TryICCSToPoints('a10a')).toBeNull();
  expect(() => ICCSToPoints('0000')).toThrow('Invalid ICCS');
  expect(() => PointsToICCS(9, 0, 0, 0)).toThrow(RangeError);
});

test.each(['(none)', '0000', '', 'a0a', 'j0a0', 'bestmove a0a1'])(
  'rejects non-move engine result %j',
  (move) => {
    expect(validateEngineMove(move, new FEN()).valid).toBe(false);
  }
);

test('validates engine move source, reachability and king safety', () => {
  expect(validateEngineMove('a1a2', new FEN())).toMatchObject({
    valid: false,
    reason: '引擎着法起点没有棋子',
  });
  expect(validateEngineMove('a9a8', new FEN())).toMatchObject({
    valid: false,
    reason: '引擎移动了非当前方棋子',
  });
  expect(validateEngineMove('a0b1', new FEN())).toMatchObject({
    valid: false,
    reason: '引擎着法不符合棋子走法',
  });
  expect(validateEngineMove('a0a1', new FEN()).valid).toBe(true);

  const pinned = new FEN('4k4/9/9/9/9/9/9/4r4/4R4/4K4 w');
  expect(validateEngineMove('e1d1', pinned)).toMatchObject({
    valid: false,
    reason: '引擎着法会导致己方被将军',
  });

  const facing = new FEN('4k4/9/9/9/9/9/9/9/4R4/4K4 w');
  expect(validateEngineMove('e1d1', facing)).toMatchObject({
    valid: false,
    reason: '引擎着法会导致将帅照面',
  });
});
