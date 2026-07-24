import * as React from 'react';

interface PlaybackBarProps {
  currentIndex: number;
  totalMoves: number;
  onGoBack: () => void;
  onGoForward: () => void;
  onGoToStart: () => void;
  onGoToEnd: () => void;
  onContinue: () => void;
}

export const PlaybackBar = React.memo(
  ({
    currentIndex,
    totalMoves,
    onGoBack,
    onGoForward,
    onGoToStart,
    onGoToEnd,
    onContinue,
  }: PlaybackBarProps) => {
    const canGoBack = currentIndex > 0;
    const canGoForward = currentIndex < totalMoves;

    return (
      <div className="command-line playback-bar">
        <div className="playback-controls">
          <button
            className="button-41 playback-button"
            disabled={!canGoBack}
            onClick={onGoToStart}
            title="跳到开始"
          >
            ⏮
          </button>
          <button
            className="button-41 playback-button"
            disabled={!canGoBack}
            onClick={onGoBack}
            title="上一步"
          >
            ◀
          </button>
          <span className="playback-position">
            {currentIndex} / {totalMoves}
          </span>
          <button
            className="button-41 playback-button"
            disabled={!canGoForward}
            onClick={onGoForward}
            title="下一步"
          >
            ▶
          </button>
          <button
            className="button-41 playback-button"
            disabled={!canGoForward}
            onClick={onGoToEnd}
            title="跳到结束"
          >
            ⏭
          </button>
        </div>
        <div className="playback-actions">
          <button className="button-41" onClick={onContinue} title="从当前位置继续对局">
            继续对局
          </button>
        </div>
      </div>
    );
  }
);
