import * as React from 'react';

export interface CommandBarProps {
    canback: boolean,
    back: ()=>void,
    restart: ()=>void
}
export const CommandBar = React.memo(({canback,back,restart}:CommandBarProps) => {
    return (
        <div className='command-line'>
            <div>
                <button className='button-41' disabled={!canback} onClick={back}>悔棋</button>
            </div>
            <div>
                <button className='button-41' onClick={restart}>重来</button>
            </div>
            <div>
                <button className='button-41' disabled={true}>设置</button>
            </div>
        </div>
    )
})