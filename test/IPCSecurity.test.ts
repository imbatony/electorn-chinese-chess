import {
  isAboutAdjustWindowRequest,
  isAllowedExternalUrl,
  isBgmStatus,
  isPlayerSides,
  isQueryMoveRequest,
} from '../src/common/IPCSecurity';

const VALID_FEN = 'rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR w';

describe('IPC security validators', () => {
  test('accepts only valid engine query payloads', () => {
    expect(isQueryMoveRequest({ fenStr: VALID_FEN, difficulty: 3, turn: true })).toBe(true);
    expect(isQueryMoveRequest({ fenStr: VALID_FEN, difficulty: 0, turn: true })).toBe(false);
    expect(isQueryMoveRequest({ fenStr: 'invalid', difficulty: 1, turn: true })).toBe(false);
  });

  test('accepts only known player IDs', () => {
    const known = (id: string) => id === 'human' || id === 'engine-1';
    expect(isPlayerSides({ red: 'human', black: 'engine-1' }, known)).toBe(true);
    expect(isPlayerSides({ red: 'unknown', black: 'human' }, known)).toBe(false);
  });

  test('validates BGM and about window payloads', () => {
    expect(isBgmStatus({ enabled: true, type: 'board' })).toBe(true);
    expect(isBgmStatus({ enabled: true, type: 'other' })).toBe(false);
    expect(isAboutAdjustWindowRequest({ height: 400, width: 500, showCloseButton: true })).toBe(
      true
    );
    expect(isAboutAdjustWindowRequest({ height: -1, width: 500, showCloseButton: true })).toBe(
      false
    );
  });

  test('allows only HTTP(S) external URLs', () => {
    expect(isAllowedExternalUrl('https://example.com/path')).toBe(true);
    expect(isAllowedExternalUrl('http://example.com')).toBe(true);
    expect(isAllowedExternalUrl('file:///C:/Windows/System32')).toBe(false);
    expect(isAllowedExternalUrl('javascript:alert(1)')).toBe(false);
    expect(isAllowedExternalUrl('not a URL')).toBe(false);
  });
});
