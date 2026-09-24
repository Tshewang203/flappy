import { GAME_WIDTH, COLORS, MODES, STORY_LEVELS, POWER_UP_VISUALS } from '../config/constants.js';
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
    // The scene instance is reused between runs: drop HUD refs from a previous mode
    this.levelText = null;
    this.checkpointText = null;
  }

  create() {
    const modeInfo = Object.values(MODES).find((m) => m.id === this.mode);

    const modeLabel = this.add
      .text(38, 16, modeInfo?.name || '', {
        fontFamily: 'Orbitron',
        fontSize: '13px',
        color: COLORS.text,
      })
      .setScrollFactor(0).setDepth(1);
    this.add.rectangle(modeLabel.x + modeLabel.width / 2 - 14, 24, modeLabel.width + 44, 32, 0x0a1e33, 0.65)
      .setStrokeStyle(1, COLORS.gold, 0.4).setScrollFactor(0).setDepth(0);
    if (modeInfo?.iconType) {
      UIHelper.drawIcon(this, modeInfo.iconType, 26, 24, 8, COLORS.gold, 1);
    }

    this.isJubilee = Boolean(modeInfo?.stages);

    if (modeInfo?.hasQuiz && !this.isJubilee) {
      const quizLabel = `${this.player?.department || 'Dept'} Quiz`;
      const quizIcon = 'target';
      const quizText = this.add
        .text(GAME_WIDTH - 28, 16, quizLabel, {
          fontFamily: 'Inter',
          fontSize: '12px',
          color: COLORS.gold,
        })
        .setOrigin(1, 0)
        .setScrollFactor(0).setDepth(1);
      this.add.rectangle(GAME_WIDTH - 16 - quizText.width / 2 - 12, 24, quizText.width + 40, 32, 0x0a1e33, 0.65)
        .setStrokeStyle(1, COLORS.gold, 0.4).setScrollFactor(0).setDepth(0);
      UIHelper.drawIcon(this, quizIcon, GAME_WIDTH - 16 - quizText.width - 14, 24, 7, COLORS.gold, 1);
    }

    if (this.isJubilee) {
      // Stage + distance to the next quiz checkpoint
      this.levelText = this.add
        .text(GAME_WIDTH - 28, 16, `STAGE 1 / ${STORY_LEVELS.length}`, {
          fontFamily: 'Orbitron',
          fontSize: '13px',
          color: COLORS.gold,
          fontStyle: 'bold',
        })
        .setOrigin(1, 0)
        .setScrollFactor(0).setDepth(1);
      this.checkpointText = this.add
        .text(GAME_WIDTH - 28, 34, '', {
          fontFamily: 'Inter',
          fontSize: '12px',
          color: COLORS.textMuted,
        })
        .setOrigin(1, 0)
        .setScrollFactor(0).setDepth(1);
      // Fixed-size pill behind both lines (the checkpoint text changes length as you play)
      this.add.rectangle(GAME_WIDTH - 16 - 95, 33, 190, 46, 0x0a1e33, 0.65)
        .setStrokeStyle(1, COLORS.gold, 0.4).setScrollFactor(0).setDepth(0);
      this.updateCheckpointText();
    }

    this.scoreBadge = this.add.rectangle(GAME_WIDTH / 2, 80, 110, 64, 0x0a1e33, 0.75)
      .setStrokeStyle(3, COLORS.gold, 0.9)
      .setScrollFactor(0)
      .setDepth(0)
      .setAlpha(0.3);

    this.scoreText = this.add
      .text(GAME_WIDTH / 2, 80, '0', {
        fontFamily: 'Orbitron',
        fontSize: '44px',
        color: COLORS.gold,
        fontStyle: 'bold',
        stroke: '#0a1e33',
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(1)
      .setAlpha(0.3);

    this.powerUpLabel = null;

    const gameScene = this.scene.get('GameScene');
    this._onScoreUpdate = (score) => {
      this.currentScore = score;
      this.updateCheckpointText();
      this.scoreText.setText(String(score));
      this.scoreText.setAlpha(1);
      this.scoreBadge.setAlpha(1);
      this.tweens.add({
        targets: [this.scoreText, this.scoreBadge],
        scaleX: { from: 1.15, to: 1 },
        scaleY: { from: 1.15, to: 1 },
        duration: 150,
      });
    };
    this._onPowerUp = ({ label, icon, visual }) => this.showPowerUpLabel(label, visual, icon);
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
      this.scoreBadge.setAlpha(1);
    };
    this._onStoryLevelChange = (level) => {
      this.storyLevel = level;
      this.levelText?.setText(`STAGE ${level} / ${STORY_LEVELS.length}`);
      this.updateCheckpointText();
    };
    this._onCheckpointFailed = () => {
      this.showBanner('CHECKPOINT MISSED — FLY ON & RETRY', '#ff8a7a');
    };
    this._onStoryLevelComplete = ({ storyComplete }) => {
      const message = storyComplete ? 'SILVER JUBILEE COMPLETE!' : 'STAGE CLEARED!';
      // Above the "STAGE N" title GameScene shows during the transition
      const notify = this.add
        .text(GAME_WIDTH / 2, 150, message, {
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
    gameScene.events.on('checkpointFailed', this._onCheckpointFailed);

    this.events.once('shutdown', this.cleanupUIScene, this);
  }

  /** "3 to checkpoint" / "Checkpoint quiz!" under the stage label (Jubilee only). */
  updateCheckpointText() {
    if (!this.checkpointText) return;
    const level = STORY_LEVELS[this.storyLevel - 1];
    if (!level) return;
    // Count down to the next quiz: a mid-stage bonus quiz if one is ahead, else the checkpoint
    const nextMid = (level.quizAt || []).find((at) => at > this.currentScore);
    if (nextMid != null) {
      this.checkpointText.setText(`${nextMid - this.currentScore} to CST quiz`);
      return;
    }
    const remaining = level.requiredScore - this.currentScore;
    this.checkpointText.setText(remaining > 0 ? `${remaining} to quiz checkpoint` : 'Quiz checkpoint!');
  }

  /**
   * Brief pill under the score: mini collectible (or a glyph for surprise rewards) + name.
   * Slides in, holds ~1s, fades. A new pickup replaces the current pill.
   */
  showPowerUpLabel(label, visual, icon) {
    if (this.powerUpLabel) {
      this.tweens.killTweensOf(this.powerUpLabel);
      this.powerUpLabel.destroy();
    }
    const accent = visual ? POWER_UP_VISUALS[visual].color : 0xffd23f;
    const iconSize = 30;
    const padX = 8;
    const gap = 10;
    const text = this.add.text(0, 0, label.toUpperCase(), {
      fontFamily: 'Orbitron', fontSize: '15px', fontStyle: 'bold', color: '#ffffff',
    }).setOrigin(0, 0.5);
    const w = Math.min(GAME_WIDTH - 40, padX + iconSize + gap + text.width + 18);
    const h = 42;
    const iconX = -w / 2 + padX + iconSize / 2 + 2;
    text.setX(iconX + iconSize / 2 + gap);

    const bg = this.add.graphics();
    bg.fillStyle(0x0f1f33, 0.88);
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, h / 2);
    bg.lineStyle(2.5, accent, 1);
    bg.strokeRoundedRect(-w / 2, -h / 2, w, h, h / 2);

    const parts = [bg];
    if (visual) {
      ['pu_badge_', 'pu_icon_'].forEach((prefix) => {
        parts.push(this.add.image(iconX, 0, `${prefix}${visual}`).setDisplaySize(iconSize, iconSize));
      });
    } else if (icon) {
      const glyph = UIHelper.drawIcon(this, icon, 0, 0, 9, COLORS.gold, 0);
      glyph.setPosition(iconX, 0);
      parts.push(glyph);
    }
    parts.push(text);

    const pill = this.add.container(GAME_WIDTH / 2, 118, parts).setAlpha(0).setScrollFactor(0).setDepth(20);
    this.powerUpLabel = pill;
    this.tweens.add({ targets: pill, y: 132, alpha: 1, duration: 180, ease: 'Back.easeOut' });
    this.tweens.add({
      targets: pill,
      y: 124,
      alpha: 0,
      delay: 1250,
      duration: 260,
      onComplete: () => {
        pill.destroy();
        if (this.powerUpLabel === pill) this.powerUpLabel = null;
      },
    });
  }

  showBanner(message, color) {
    const banner = this.add
      .text(GAME_WIDTH / 2, 170, message, {
        fontFamily: 'Orbitron',
        fontSize: '18px',
        color,
        fontStyle: 'bold',
        stroke: '#0f1f33',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setAlpha(0);
    this.tweens.add({
      targets: banner,
      alpha: { from: 0, to: 1 },
      duration: 300,
      yoyo: true,
      hold: 1600,
      onComplete: () => banner.destroy(),
    });
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
      gameScene.events.off('checkpointFailed', this._onCheckpointFailed);
    }
  }
}
