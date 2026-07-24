import type { BoardStatus } from '../src/common/IPCInfos';
import {
  getBgmMenuLabel,
  getBoardMenuState,
  getPlayerMenuLabel,
  updateBgmMenuState,
  updateBoardMenuState,
  updateSideMenuState,
} from '../src/main/menu-state';

describe('menu state', () => {
  test('uses action wording for the current BGM state', () => {
    expect(getBgmMenuLabel(true)).toBe('关闭音乐');
    expect(getBgmMenuLabel(false)).toBe('打开音乐');
  });

  test('disables board actions when no board is active', () => {
    expect(getBoardMenuState(null)).toEqual({
      canSave: false,
      canExport: false,
      canBack: false,
      canRestart: false,
      canRotate: false,
      canCopyFen: false,
    });
  });

  test('enables only board-safe actions before the first move', () => {
    expect(
      getBoardMenuState({
        canBack: false,
        isEnd: false,
        curFen: 'initial-fen',
        moveCount: 0,
        isPlaybackMode: false,
      })
    ).toEqual({
      canSave: false,
      canExport: false,
      canBack: false,
      canRestart: true,
      canRotate: true,
      canCopyFen: true,
    });
  });

  test('derives action availability from the current board', () => {
    expect(
      getBoardMenuState({
        canBack: true,
        isEnd: false,
        curFen: 'fen',
        moveCount: 2,
        isPlaybackMode: false,
      })
    ).toEqual({
      canSave: true,
      canExport: true,
      canBack: true,
      canRestart: true,
      canRotate: true,
      canCopyFen: true,
    });
  });

  test('disables undo during playback without disabling read-only actions', () => {
    const state = getBoardMenuState({
      canBack: true,
      isEnd: false,
      curFen: 'fen',
      moveCount: 2,
      isPlaybackMode: true,
    });

    expect(state.canBack).toBe(false);
    expect(state.canSave).toBe(true);
    expect(state.canExport).toBe(true);
    expect(state.canRotate).toBe(true);
    expect(state.canCopyFen).toBe(true);
  });

  test('marks selected and unavailable players consistently', () => {
    expect(getPlayerMenuLabel('象棋爱好者', 'human', 'human')).toBe('象棋爱好者☑️');
    expect(getPlayerMenuLabel('Pikafish', 'pikafish', 'human')).toBe('Pikafish');
    expect(getPlayerMenuLabel('Pikafish', 'pikafish', 'human', false)).toBe(
      'Pikafish (不可用)'
    );
  });

  test('updates state before refreshing the menu', () => {
    const state: {
      bgm: boolean;
      boardStaus: BoardStatus | null;
      redSide: string;
      blackSide: string;
    } = {
      bgm: true,
      boardStaus: null,
      redSide: 'human',
      blackSide: 'human',
    };

    updateBgmMenuState(state, false, () => expect(state.bgm).toBe(false));

    const boardStatus = {
      canBack: false,
      isEnd: false,
      curFen: 'fen',
      moveCount: 0,
    };
    updateBoardMenuState(state, boardStatus, () => expect(state.boardStaus).toBe(boardStatus));

    updateSideMenuState(state, { red: 'engine', black: 'human' }, () =>
      expect(state.redSide).toBe('engine')
    );
  });

  test('does not rebuild the menu for an unchanged side echo', () => {
    const state = { redSide: 'human', blackSide: 'engine' };
    const refresh = jest.fn();

    updateSideMenuState(state, { red: 'human', black: 'engine' }, refresh);

    expect(refresh).not.toHaveBeenCalled();
  });
});
