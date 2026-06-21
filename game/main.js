import { GAME_WIDTH, GAME_HEIGHT } from './config/constants.js';
import { BootScene } from './scenes/BootScene.js';
import { IntroScene } from './scenes/IntroScene.js';
import { MenuScene } from './scenes/MenuScene.js';
import { PlayerInfoScene } from './scenes/PlayerInfoScene.js';
import { ModeScene } from './scenes/ModeScene.js';
import { GameScene } from './scenes/GameScene.js';
import { QuizScene } from './scenes/QuizScene.js';
import { LegacyScene } from './scenes/LegacyScene.js';
import { UIScene } from './scenes/UIScene.js';
import { LeaderboardScene } from './scenes/LeaderboardScene.js';
import { HallOfFameScene } from './scenes/HallOfFameScene.js';
import { GameOverScene } from './scenes/GameOverScene.js';
import { initFirebase } from './firebase.js';

initFirebase();

const config = {
  type: Phaser.AUTO,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  parent: 'game-container',
  transparent: true,
  backgroundColor: '#004F8A',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'arcade',
    arcade: { gravity: { y: 0 }, debug: false },
  },
  scene: [
    BootScene,
    IntroScene,
    MenuScene,
    PlayerInfoScene,
    ModeScene,       // ModeSelectionScene
    GameScene,
    QuizScene,
    LegacyScene,
    UIScene,
    LeaderboardScene,
    HallOfFameScene,
    GameOverScene,
  ],
  input: { activePointers: 3 },
  render: { antialias: true, pixelArt: false, roundPixels: true },
  audio: { disableWebAudio: false },
};

const game = new Phaser.Game(config);

game.events.once('ready', () => {
  const canvas = game.canvas;
  if (canvas) {
    canvas.setAttribute('tabindex', '1');
    canvas.style.outline = 'none';
    canvas.focus();
  }
});

export default game;
