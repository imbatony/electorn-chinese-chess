import * as React from 'react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChessContext } from './context';

const Welcome = () => {
    const chessContext = React.useContext(ChessContext)
    const [step, setStep] = useState(1);
    const clickCompat = () => {
        setStep(2);
    }
    const renderMenu = () => {
        if (step === 1) {
            return <div className='menu_box'>
                <a onClick={clickCompat}>人机对弈</a>
                <a onClick={chessContext.exit}>退出</a>
            </div>
        } else if (step === 2) {
            return <div className='menu_box'>
                <a onClick={() => { chessContext.setDifficulty(1); setStep(3) }}>初级水平</a>
                <a onClick={() => { chessContext.setDifficulty(2); setStep(3) }}>中级水平</a>
                <a onClick={() => { chessContext.setDifficulty(3); setStep(3) }}>高级水平</a>
                <a onClick={() => setStep(1)}>上一步</a>
            </div>
        } else if (step === 3) {
            return <div className='menu_box'>
                <Link to={`/board/true/true`}>执红</Link>
                <Link to={`/board/false/false`}>执黑</Link>
                <a onClick={() => setStep(2)}>上一步</a>
            </div>
        }
    }
    React.useEffect(() => {
        chessContext.setType('welcome')
    }, [])
    return <div className='welcome'>
        <div className='title' style={{ padding: 60 }}>
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