import { GAME_WIDTH, COLORS, MODES } from '../config/constants.js';

/**
 * UIScene — HUD overlay running parallel to GameScene.
 */
export class UIScene extends Phaser.Scene {
  constructor() {
    super({ key: 'UIScene' });
  }

  init(data) {
    this.mode = data?.mode || 'flappy_cst';
    this.player = data?.player;
    this.currentScore = 0;
  }

  create() {
    const modeInfo = Object.values(MODES).find((m) => m.id === this.mode);

    this.add
      .text(16, 16, `${modeInfo?.emoji || ''} ${modeInfo?.name || ''}`, {
        fontFamily: 'Orbitron',
        fontSize: '13px',
        color: COLORS.textMuted,
      })
      .setScrollFactor(0);

    if (modeInfo?.hasQuiz) {
      const quizLabel = this.mode === 'journey'
        ? '🏛️ CST @ 5·15·25'
        : `🎯 ${this.player?.department || 'Dept'} Quiz`;
      this.add
        .text(GAME_WIDTH - 16, 16, quizLabel, {
          fontFamily: 'Inter',
          fontSize: '12px',
          color: COLORS.gold,
        })
        .setOrigin(1, 0)
        .setScrollFactor(0);
    }

    this.scoreText = this.add
      .text(GAME_WIDTH / 2, 80, '0', {
        fontFamily: 'Orbitron',
        fontSize: '48px',
        color: COLORS.silver,
        fontStyle: 'bold',
        stroke: '#0f1f33',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setAlpha(0.3);

    this.powerUpText = this.add
      .text(GAME_WIDTH / 2, 130, '', {
        fontFamily: 'Inter',
        fontSize: '15px',
        color: COLORS.gold,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setVisible(false);

    const gameScene = this.scene.get('GameScene');
    this._onScoreUpdate = (score) => {
      this.currentScore = score;
      this.scoreText.setText(String(score));
      this.scoreText.setAlpha(1);
      this.tweens.add({
        targets: this.scoreText,
        scaleX: { from: 1.2, to: 1 },
        scaleY: { from: 1.2, to: 1 },
        duration: 150,
      });
    };
    this._onPowerUp = ({ label }) => {
      this.powerUpText.setText(`${label} Active!`);
      this.powerUpText.setVisible(true);
      this.tweens.add({
        targets: this.powerUpText,
        alpha: { from: 1, to: 0 },
        duration: 2000,
        onComplete: () => this.powerUpText.setVisible(false),
      });
    };
    this._onEraChange = (milestone) => {
      const eraNotify = this.add
        .text(GAME_WIDTH / 2, GAME_WIDTH / 2, milestone.era, {
          fontFamily: 'Orbitron',
          fontSize: '22px',
          color: COLORS.gold,
          fontStyle: 'bold',
        })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setAlpha(0);

      this.tweens.add({
        targets: eraNotify,
        alpha: { from: 0, to: 1 },
        y: eraNotify.y - 30,
        duration: 600,
        yoyo: true,
        hold: 1000,
        onComplete: () => eraNotify.destroy(),
      });
    };
    this._onGameStarted = () => {
      this.scoreText.setAlpha(1);
    };

    gameScene.events.on('scoreUpdate', this._onScoreUpdate);
    gameScene.events.on('powerUpCollected', this._onPowerUp);
    gameScene.events.on('eraChange', this._onEraChange);
    gameScene.events.on('gameStarted', this._onGameStarted);

    this.events.once('shutdown', this.cleanupUIScene, this);
  }

  cleanupUIScene() {
    const gameScene = this.scene.get('GameScene');
    if (gameScene) {
      gameScene.events.off('scoreUpdate', this._onScoreUpdate);
      gameScene.events.off('powerUpCollected', this._onPowerUp);
      gameScene.events.off('eraChange', this._onEraChange);
      gameScene.events.off('gameStarted', this._onGameStarted);
    }
  }
}
