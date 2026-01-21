import bg from '../../assets/audio/bg.mp3';
import bgm from '../../assets/audio/bgm.mp3';
import checkingUrl from '../../assets/audio/check.mp3';
import beCheckingUrl from '../../assets/audio/checked.mp3';
import eatUrl from '../../assets/audio/eat.mp3';
import clickUrl from '../../assets/audio/go.mp3';
import goerror from '../../assets/audio/goerror.mp3';
import selectUrl from '../../assets/audio/select.mp3';

export const clickSound = new Audio(clickUrl);
export const selectSound = new Audio(selectUrl);
export const eatSound = new Audio(eatUrl);
export const checkingSound = new Audio(checkingUrl);
export const checkedSound = new Audio(beCheckingUrl);
export const goErrorSound = new Audio(goerror);
// 这些音效仅在 playBgm 中内部使用
const bgSound = new Audio(bg);
const bgmSound = new Audio(bgm);

export const playBgm = function (enabled: boolean, type: 'welcome' | 'board') {
  bgSound.pause();
  bgmSound.pause();
  if (enabled) {
    if (type === 'welcome') {
      bgSound.loop = true;
      bgSound.play();
    }
    if (type === 'board') {
      bgmSound.loop = true;
      bgmSound.play();
    }
  }
};
