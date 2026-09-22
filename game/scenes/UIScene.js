import { GAME_WIDTH, COLORS, MODES } from '../config/constants.js';
import { UIHelper } from '../utils/UIHelper.js';

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
    this.storyLevel = 1;
  }

  create() {
    const modeInfo = Object.values(MODES).find((m) => m.id === this.mode);

    if (modeInfo?.iconType) {
      UIHelper.drawIcon(this, modeInfo.iconType, 26, 24, 8, COLORS.textMuted, 5);
    }
    this.add
      .text(38, 16, modeInfo?.name || '', {
        fontFamily: 'Orbitron',
        fontSize: '13px',
        color: COLORS.textMuted,
      })
      .setScrollFactor(0);

    if (modeInfo?.hasQuiz) {
      const quizLabel = this.mode === 'journey'
        ? 'CST @ 5·15·25'
        : `${this.player?.department || 'Dept'} Quiz`;
      const quizIcon = this.mode === 'journey' ? 'pin' : 'target';
      const quizText = this.add
        .text(GAME_WIDTH - 28, 16, quizLabel, {
          fontFamily: 'Inter',
          fontSize: '12px',
          color: COLORS.gold,
        })
        .setOrigin(1, 0)
        .setScrollFactor(0);
      UIHelper.drawIcon(this, quizIcon, GAME_WIDTH - 16 - quizText.width - 14, 24, 7, COLORS.gold, 5);
    }

    if (this.mode === 'story') {
      this.levelText = this.add
        .text(GAME_WIDTH - 16, 16, 'LEVEL 1 / 6', {
          fontFamily: 'Orbitron',
          fontSize: '13px',
          color: COLORS.gold,
          fontStyle: 'bold',
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
    this._onPowerUp = ({ label, icon }) => {
      this.powerUpText.setText(`${label} Active!`);
      this.powerUpText.setVisible(true);
      this.powerUpIcon?.destroy();
      if (icon) {
        this.powerUpIcon = UIHelper.drawIcon(this, icon, GAME_WIDTH / 2 - this.powerUpText.width / 2 - 14, 130, 8, COLORS.gold, 1);
      }
      const targets = icon ? [this.powerUpText, this.powerUpIcon] : [this.powerUpText];
      this.tweens.add({
        targets,
        alpha: { from: 1, to: 0 },
        duration: 2000,
        onComplete: () => {
          this.powerUpText.setVisible(false);
          this.powerUpIcon?.destroy();
          this.powerUpIcon = null;
        },
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
    this._onStoryLevelChange = (level) => {
      this.storyLevel = level;
      this.levelText?.setText(`LEVEL ${level} / 6`);
    };
    this._onStoryLevelComplete = ({ storyComplete }) => {
      const message = storyComplete ? 'STORY MODE COMPLETE!' : 'LEVEL COMPLETE!';
      const notify = this.add
        .text(GAME_WIDTH / 2, GAME_WIDTH / 2, message, {
          fontFamily: 'Orbitron',
          fontSize: '22px',
          color: COLORS.gold,
          fontStyle: 'bold',
        })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setAlpha(0);

      this.tweens.add({
        targets: notify,
        alpha: { from: 0, to: 1 },
        y: notify.y - 30,
        duration: 600,
        yoyo: true,
        hold: 1000,
        onComplete: () => notify.destroy(),
      });
    };

    gameScene.events.on('scoreUpdate', this._onScoreUpdate);
    gameScene.events.on('powerUpCollected', this._onPowerUp);
    gameScene.events.on('eraChange', this._onEraChange);
    gameScene.events.on('gameStarted', this._onGameStarted);
    gameScene.events.on('storyLevelChange', this._onStoryLevelChange);
    gameScene.events.on('storyLevelComplete', this._onStoryLevelComplete);

    this.events.once('shutdown', this.cleanupUIScene, this);
  }

  cleanupUIScene() {
    const gameScene = this.scene.get('GameScene');
    if (gameScene) {
      gameScene.events.off('scoreUpdate', this._onScoreUpdate);
      gameScene.events.off('powerUpCollected', this._onPowerUp);
      gameScene.events.off('eraChange', this._onEraChange);
      gameScene.events.off('gameStarted', this._onGameStarted);
      gameScene.events.off('storyLevelChange', this._onStoryLevelChange);
      gameScene.events.off('storyLevelComplete', this._onStoryLevelComplete);
    }
  }
}
