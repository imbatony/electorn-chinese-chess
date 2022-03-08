import * as React from 'react';
import { render } from 'react-dom';
import { HashRouter, Link, Route, Routes } from "react-router-dom";
import Welcome from "./Welcome";
import Board from "./Board";
const App = () => {
    return <>
        <HashRouter>
            <Routes>
                <Route path='/' element={<Welcome/>} />
                <Route path='/board/:difficulty/:rotation/:red' element={<Board/>}/>
            </Routes>
        </HashRouter>
    </>
}
render(<App/>, document.getElementById("root"));