import type { BoardStatus } from '../common/IPCInfos';

type MenuRefresh = () => void;

export interface BoardMenuState {
  canSave: boolean;
  canExport: boolean;
  canBack: boolean;
  canRestart: boolean;
  canRotate: boolean;
  canCopyFen: boolean;
}

export function getBoardMenuState(status: BoardStatus | null): BoardMenuState {
  const hasBoard = status !== null;
  const hasMoves = (status?.moveCount ?? 0) > 0;

  return {
    canSave: hasMoves,
    canExport: hasMoves,
    canBack: !!status?.canBack && !status.isPlaybackMode,
    canRestart: hasBoard,
    canRotate: hasBoard,
    canCopyFen: hasBoard,
  };
}

export function getBgmMenuLabel(enabled: boolean): string {
  return enabled ? '关闭音乐' : '打开音乐';
}

export function getPlayerMenuLabel(
  name: string,
  playerId: string,
  selectedId: string,
  available = true
): string {
  if (playerId === selectedId) {
    return `${name}☑️`;
  }
  return available ? name : `${name} (不可用)`;
}

export function updateBgmMenuState(
  target: { bgm: boolean },
  enabled: boolean,
  refresh: MenuRefresh
): void {
  target.bgm = enabled;
  refresh();
}

export function updateBoardMenuState(
  target: { boardStaus: BoardStatus | null },
  status: BoardStatus | null,
  refresh: MenuRefresh
): void {
  target.boardStaus = status;
  refresh();
}

export function updateSideMenuState(
  target: { redSide: string; blackSide: string },
  sides: { red: string; black: string },
  refresh: MenuRefresh
): void {
  const changed = target.redSide !== sides.red || target.blackSide !== sides.black;
  target.redSide = sides.red;
  target.blackSide = sides.black;
  if (changed) {
    refresh();
  }
}
