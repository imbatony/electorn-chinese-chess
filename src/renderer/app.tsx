import * as React from 'react';
import { render } from 'react-dom';
import { HashRouter, Route, Routes } from "react-router-dom";
import Welcome from "./Welcome";
import Board from "./Board";
import { ChessContext, defaultChessState } from './context';
import {
    OP_UPDATE_SIDE
} from "../common/IPCInfos";
import { PlaySide } from './types';
let onChangeSide: (prev: PlaySide, cur: PlaySide) => void;
const { ipcRenderer } = window.require("electron");
const App = () => {
    const [redSide, setRedSideState] = React.useState('human');
    const [blackSide, setBlackSideState] = React.useState('human');
    React.useEffect(() => {
        ipcRenderer.on(OP_UPDATE_SIDE, (evt, { red, black }) => {
            const prevRideSide = redSide;
            const prevBlckSide = blackSide;
            setRedSideState(red);
            setBlackSideState(black);
            onChangeSide && onChangeSide({ red: prevRideSide, black: prevBlckSide }, { red: red, black: black })
        });
    }, []);
    const setRedSide = (red: string) => {
        const prevRideSide = redSide;
        const prevBlckSide = blackSide;
        setRedSideState(red);
        onChangeSide && onChangeSide({ red: prevRideSide, black: prevBlckSide }, { red: red, black: blackSide })
    }
    const setBlackSide = (black: string) => {
        const prevRideSide = redSide;
        const prevBlckSide = blackSide;
        setBlackSideState(black);
        onChangeSide && onChangeSide({ red: prevRideSide, black: prevBlckSide }, { red: redSide, black: black })
    }
    const setChangeSideCallBack=( sideCallBackFunc: (prev: PlaySide, cur: PlaySide) => void)=>{
        onChangeSide = sideCallBackFunc
    }
    return <>
        <ChessContext.Provider value={{ ...defaultChessState, redSide, setRedSide, blackSide, setBlackSide,setChangeSideCallBack }}>
            <HashRouter>
                <Routes>
                    <Route path='/' element={<Welcome />} />
                    <Route path='/board/:rotation' element={<Board />} />
                </Routes>
            </HashRouter>
        </ChessContext.Provider>
    </>
}
render(<App />, document.getElementById("root"));