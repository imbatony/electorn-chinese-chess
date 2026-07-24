import * as React from 'react';
import { render } from 'react-dom';
import { HashRouter, Route, Routes } from 'react-router-dom';

import { OP_UPDATE_SIDE } from '../common/IPCInfos';
import Board from './Board';
import { ChessContext, defaultChessState } from './context';
import { PlaySide } from './types';
import Welcome from './Welcome';

let onChangeSide: (prev: PlaySide, cur: PlaySide) => void;
const { ipcRenderer } = window.require('electron');
const App = () => {
  const [sides, setSides] = React.useState<PlaySide>({ red: 'human', black: 'human' });
  const previousSides = React.useRef(sides);

  React.useEffect(() => {
    const handleSideUpdate = (_evt: unknown, nextSides: PlaySide) => {
      setSides(nextSides);
    };
    ipcRenderer.on(OP_UPDATE_SIDE, handleSideUpdate);
    return () => {
      ipcRenderer.removeListener(OP_UPDATE_SIDE, handleSideUpdate);
    };
  }, []);

  React.useEffect(() => {
    const previous = previousSides.current;
    if (previous.red !== sides.red || previous.black !== sides.black) {
      onChangeSide?.(previous, sides);
      previousSides.current = sides;
    }
    ipcRenderer.send(OP_UPDATE_SIDE, sides);
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
        <HashRouter>
          <Routes>
            <Route path="/" element={<Welcome />} />
            <Route path="/board/:rotation" element={<Board />} />
          </Routes>
        </HashRouter>
      </ChessContext.Provider>
    </>
  );
};
render(<App />, document.getElementById('root'));
