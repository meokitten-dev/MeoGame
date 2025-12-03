// src/lib/sound.js
import { Howl, Howler } from 'howler';

const sounds = {
  bg: new Howl({ src: ['/sounds/bg.mp3'], loop: true, volume: 0.3 }),
  mine: new Howl({ src: ['/sounds/mine.mp3'], volume: 0.6 }),
  'loot-common': new Howl({ src: ['/sounds/loot-common.mp3'], volume: 0.7 }),
  'loot-rare': new Howl({ src: ['/sounds/loot-rare.mp3'], volume: 0.8 }),
  troll: new Howl({ src: ['/sounds/troll.mp3'], volume: 0.7 }),
  buff: new Howl({ src: ['/sounds/buff.mp3'], volume: 0.7 }),
  click: new Howl({ src: ['/sounds/click.mp3'], volume: 0.5 }),
};

// Tự động giảm âm nhạc nền khi hiệu ứng phát
Object.keys(sounds).forEach(key => {
  if (key !== 'bg') {
    sounds[key].on('play', () => {
      sounds.bg.volume(0.1);
      setTimeout(() => sounds.bg.volume(0.3), 500);
    });
  }
});

export const playSound = (name) => {
  if (sounds[name]) {
    sounds[name].play();
  }
};

export const playBgMusic = () => {
  sounds.bg.play();
};

export const stopBgMusic = () => {
  sounds.bg.stop();
};