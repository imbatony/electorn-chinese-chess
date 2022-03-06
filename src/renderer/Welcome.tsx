import * as React from 'react';
import { useState } from 'react';
const { ipcRenderer } = window.require('electron');
import { Link } from 'react-router-dom';
const Welcome = () => {
    const [step, setStep] = useState(1);
    const clickCompat = () => {
        setStep(2);
    }
    const exit = () => {
        ipcRenderer.send('close-me')
    }
    const renderMenu = () => {
        if (step === 1) {
            return <div className='menu_box'>
                <a onClick={clickCompat}>人机对弈</a>
                <a onClick={exit}>退出</a>
            </div>
        } else if (step === 2) {
            return <div className='menu_box'>
                <Link to='/board/1'>初级水平</Link>
                <Link to='/board/2'>中级水平</Link>
                <Link to='/board/3'>高级水平</Link>
                <a onClick={() => setStep(1)}>上一步</a>
            </div>
        }
    }
    return <div className='welcome'>
        <div className='title' style={{padding:60}}>
            <span>中国象棋</span>
        </div>
        <div className='stack'>
            <div className='menu'>
                <div className='board'>
                    {renderMenu()}
                </div>
            </div>
        </div>
    </div>
}
export default Welcome;