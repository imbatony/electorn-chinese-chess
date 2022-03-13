import * as React from 'react';
import { render } from 'react-dom';
import { HashRouter, Link, Route, Routes } from "react-router-dom";
import Welcome from "./Welcome";
import Board from "./Board";
import { BgmContext } from './context';
const { ipcRenderer } = window.require('electron');
import { playBgm } from './Sound';
const App = () => {
    const [bgmOn, setBgmOn] = React.useState(true);
    const [bgmType, setBgmType] = React.useState<"welcome" | "board">('welcome');

    React.useEffect(() => {
        ipcRenderer.removeAllListeners('op:togglebgm');
        ipcRenderer.on('op:togglebgm', () => {
            setBgmOn(!bgmOn);
            playBgm(bgmOn, bgmType)
        })
        ipcRenderer.send('bgm', bgmOn, bgmType);
        playBgm(bgmOn, bgmType)
    }, [bgmOn, bgmType])

    return <>
        <BgmContext.Provider value={{ on: bgmOn, type: bgmType, setType: (type: "welcome" | "board") => { setBgmType(type) }, setBgmOn: (on: boolean) => { setBgmOn(on) } }}>
            <HashRouter>
                <Routes>
                    <Route path='/' element={<Welcome />} />
                    <Route path='/board/:difficulty/:rotation/:red' element={<Board />} />
                </Routes>
            </HashRouter>
        </BgmContext.Provider>
    </>
}
render(<App />, document.getElementById("root"));