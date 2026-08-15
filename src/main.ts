import Phaser from 'phaser';
import './ui/styles.css';
import { GAME_HEIGHT, GAME_WIDTH } from './game/config';
import { GameScene } from './game/scene';
new Phaser.Game({
  type: Phaser.AUTO,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  parent: 'game-root',
  backgroundColor: '#0b1720',
  render: { pixelArt: true, antialias: false, antialiasGL: false, roundPixels: true },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [GameScene],
});
if ('serviceWorker' in navigator && import.meta.env.PROD)
  navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`);
