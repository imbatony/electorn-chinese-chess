import * as React from 'react';
import { createRoot } from 'react-dom/client';

import { GameRecord } from '../common/GameRecord';

import Board from './Board';
import Welcome from './Welcome';
import {
  ChessContext,
  defaultChessState,
  subscribeAutoSaveRecovery,
  subscribeGameRecordLoad,
} from './context';
import { PlaySide } from './types';

let onChangeSide: (prev: PlaySide, cur: PlaySide) => void;

const AppRoutes = () => {
  const [path, setPath] = React.useState(() => window.location.hash.slice(1) || '/');
  const [pendingRecord, setPendingRecord] = React.useState<{
    record: GameRecord;
    disposition: 'clean' | 'recovery';
  }>();

  const navigate = React.useCallback((nextPath: string) => {
    window.location.hash = nextPath;
  }, []);

  React.useEffect(() => {
    const handleHashChange = () => setPath(window.location.hash.slice(1) || '/');
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  React.useEffect(() => {
    const openBoard = (record: GameRecord, disposition: 'clean' | 'recovery') => {
      setPendingRecord({ record, disposition });
      navigate('/board/true');
    };
    const unsubscribeRecovery = subscribeAutoSaveRecovery((record) => {
      openBoard(record, 'recovery');
    });
    const unsubscribeLoad = subscribeGameRecordLoad((record) => {
      openBoard(record, 'clean');
    });
    return () => {
      unsubscribeRecovery();
      unsubscribeLoad();
    };
  }, [navigate]);

  const boardRoute = /^\/board\/(true|false)$/.exec(path);
  if (!boardRoute) {
    return <Welcome navigate={navigate} />;
  }
  return (
    <Board
      initialRotation={boardRoute[1] === 'true'}
      pendingRecord={pendingRecord}
      onRecordApplied={() => setPendingRecord(undefined)}
    />
  );
};

const App = () => {
  const [sides, setSides] = React.useState<PlaySide>({ red: 'human', black: 'human' });
  const previousSides = React.useRef(sides);

  React.useEffect(() => {
    const handleSideUpdate = (nextSides: PlaySide) => {
      setSides(nextSides);
    };
    return window.chessApi.onSidesUpdated(handleSideUpdate);
  }, []);

  React.useEffect(() => {
    const previous = previousSides.current;
    if (previous.red !== sides.red || previous.black !== sides.black) {
      onChangeSide?.(previous, sides);
      previousSides.current = sides;
    }
    window.chessApi.updateSides(sides);
  }, [sides]);

  const setPlayerSides = (nextSides: PlaySide) => {
    setSides(nextSides);
  };
  const setChangeSideCallBack = (sideCallBackFunc: (prev: PlaySide, cur: PlaySide) => void) => {
    onChangeSide = sideCallBackFunc;
  };
  return (
    <>
      <ChessContext.Provider
        value={{
          ...defaultChessState,
          redSide: sides.red,
          blackSide: sides.black,
          setSides: setPlayerSides,
          setChangeSideCallBack,
        }}
      >
        <AppRoutes />
      </ChessContext.Provider>
    </>
  );
};
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('找不到应用根节点');
}
createRoot(rootElement).render(<App />);
