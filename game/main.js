import { GAME_WIDTH, GAME_HEIGHT } from './config/constants.js';
import { BootScene } from './scenes/BootScene.js';
import { MenuScene } from './scenes/MenuScene.js';
import { PlayerInfoScene } from './scenes/PlayerInfoScene.js';
import { ModeScene } from './scenes/ModeScene.js';
import { GameScene } from './scenes/GameScene.js';
import { UIScene } from './scenes/UIScene.js';
import { GameOverScene } from './scenes/GameOverScene.js';
import { initFirebase } from './firebase.js';

// Pre-initialize Firebase
initFirebase();

const config = {
  type: Phaser.AUTO,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  parent: 'game-container',
  backgroundColor: '#0f1f33',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false,
    },
  },
  scene: [
    BootScene,
    MenuScene,
    PlayerInfoScene,
    ModeScene,
    GameScene,
    UIScene,
    GameOverScene,
  ],
  input: {
    activePointers: 3,
  },
  render: {
    antialias: true,
    pixelArt: false,
    roundPixels: true,
  },
};

const game = new Phaser.Game(config);

// Hide HTML loading screen once Phaser is ready
game.events.once('ready', () => {
  const loader = document.getElementById('loading-screen');
  if (loader) loader.classList.add('hidden');
});

export default game;
