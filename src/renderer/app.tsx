import * as React from 'react';
import { render } from 'react-dom';
import { HashRouter, Route, Routes } from "react-router-dom";
import Welcome from "./Welcome";
import Board from "./Board";
import { ChessContext, defaultChessState } from './context';

const App = () => {
    return <>
        <ChessContext.Provider value={{ ...defaultChessState}}>
            <HashRouter>
                <Routes>
                    <Route path='/' element={<Welcome />} />
                    <Route path='/board/:rotation/:red' element={<Board />} />
                </Routes>
            </HashRouter>
        </ChessContext.Provider>
    </>
}
render(<App />, document.getElementById("root"));