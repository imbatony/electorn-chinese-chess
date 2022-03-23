import { DEFAULT_ENGINE_KEY } from '../common/constants';
import * as React from 'react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChessContext } from './context';
const Welcome = () => {
    const navigate = useNavigate();
    const chessContext = React.useContext(ChessContext)
    const [step, setStep] = useState(0);
    const clickPvc = () => {
        setStep(2);
        chessContext.setRedSide('human');
        chessContext.setBlackSide(DEFAULT_ENGINE_KEY);
    }
    const clickPvp = () => {
        chessContext.setRedSide('human');
        chessContext.setBlackSide('human');
        navigate("/board/true");
    }
    const clickCvc = () => {
        chessContext.setRedSide(DEFAULT_ENGINE_KEY);
        chessContext.setBlackSide(DEFAULT_ENGINE_KEY);
        chessContext.setDifficulty(3);
        navigate("/board/true");
    }
    const renderMenu = () => {
        if(step ===0){
            return <div className='menu_box'>
            <a onClick={()=>{chessContext.setMode("normal");setStep(1);}}>普通模式</a>
            <a onClick={()=>{chessContext.setRedSide("human"); chessContext.setMode("free");chessContext.setBlackSide("human");navigate("/board/true");}}>自由模式</a>

            <a onClick={chessContext.exit}>退出</a>
        </div>
        }
        if (step === 1) {
            return <div className='menu_box'>
                <a onClick={clickPvc}>人机对弈</a>
                <a onClick={clickPvp}>人人对弈</a>
                <a onClick={clickCvc}>机器对弈</a>
                <a onClick={() => setStep(0)}>上一步</a>
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
                <a onClick={() => { navigate("/board/true"); }}>执红</a>
                <a onClick={() => { chessContext.setRedSide(chessContext.blackSide); chessContext.setBlackSide(chessContext.redSide); navigate("/board/false"); }}>执黑</a>
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