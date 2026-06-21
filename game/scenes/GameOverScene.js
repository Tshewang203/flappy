import { GAME_WIDTH, GAME_HEIGHT, COLORS, MODES } from '../config/constants.js';
import { updateBestScore, getBestScores } from '../utils/storage.js';
import { submitScore, isFirebaseConfigured } from '../firebase.js';
import { UIHelper } from '../utils/UIHelper.js';

/**
 * GameOverScene — Shows score, best score, and submit/restart options.
 */
export class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameOverScene' });
  }

  init(data) {
    this.score = data.score || 0;
    this.mode = data.mode || 'flappy_cst';
    this.player = data.player;
    this.isNewBest = updateBestScore(this.mode, this.score);
    this.scoreSubmitted = false;
  }

  create() {
    UIHelper.fadeIn(this);
    UIHelper.createBackgroundParticles(this, 10);

    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x0f1f33, 0.7);

    const modeInfo = Object.values(MODES).find((m) => m.id === this.mode);

    // Game Over title
    this.add
      .text(GAME_WIDTH / 2, 100, 'GAME OVER', {
        fontFamily: 'Orbitron',
        fontSize: '36px',
        color: '#e74c3c',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setShadow(0, 0, '#e74c3c', 6, true, true);

    // Mode
    this.add
      .text(GAME_WIDTH / 2, 150, `${modeInfo?.emoji || ''} ${modeInfo?.name || ''}`, {
        fontFamily: 'Inter',
        fontSize: '14px',
        color: COLORS.textMuted,
      })
      .setOrigin(0.5);

    // Score card
    const cardY = 230;
    this.add
      .image(GAME_WIDTH / 2, cardY, 'card_bg')
      .setDisplaySize(340, 160)
      .setAlpha(0.9);

    this.add
      .text(GAME_WIDTH / 2, cardY - 50, 'SCORE', {
        fontFamily: 'Orbitron',
        fontSize: '14px',
        color: COLORS.textMuted,
      })
      .setOrigin(0.5);

    const scoreDisplay = this.add
      .text(GAME_WIDTH / 2, cardY, String(this.score), {
        fontFamily: 'Orbitron',
        fontSize: '56px',
        color: COLORS.gold,
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.tweens.add({
      targets: scoreDisplay,
      scaleX: { from: 0.5, to: 1 },
      scaleY: { from: 0.5, to: 1 },
      duration: 500,
      ease: 'Back.easeOut',
    });

    const bests = getBestScores();
    const bestScore = bests[this.mode] || 0;

    this.add
      .text(GAME_WIDTH / 2, cardY + 50, `Best: ${bestScore}`, {
        fontFamily: 'Orbitron',
        fontSize: '16px',
        color: COLORS.silver,
      })
      .setOrigin(0.5);

    if (this.isNewBest) {
      const newBest = this.add
        .text(GAME_WIDTH / 2, cardY + 75, '🎉 NEW BEST! 🎉', {
          fontFamily: 'Orbitron',
          fontSize: '14px',
          color: COLORS.gold,
        })
        .setOrigin(0.5);

      this.tweens.add({
        targets: newBest,
        scaleX: { from: 1, to: 1.1 },
        scaleY: { from: 1, to: 1.1 },
        duration: 600,
        yoyo: true,
        repeat: -1,
      });
    }

    // Player info
    if (this.player) {
      this.add
        .text(
          GAME_WIDTH / 2,
          340,
          `${this.player.name} · ${this.player.department} · ${this.player.year}`,
          {
            fontFamily: 'Inter',
            fontSize: '12px',
            color: COLORS.textMuted,
          }
        )
        .setOrigin(0.5);
    }

    // Submit status text
    this.statusText = this.add
      .text(GAME_WIDTH / 2, 380, '', {
        fontFamily: 'Inter',
        fontSize: '12px',
        color: COLORS.textMuted,
      })
      .setOrigin(0.5);

    // Buttons
    UIHelper.createButton(this, GAME_WIDTH / 2, 440, '🔄  RESTART', () => {
      UIHelper.fadeToScene(this, 'GameScene', { mode: this.mode });
    });

    UIHelper.createButton(this, GAME_WIDTH / 2, 510, '📤  SUBMIT SCORE', () => {
      this.handleSubmit();
    });

    UIHelper.createButton(
      this,
      GAME_WIDTH / 2,
      580,
      '🏠  MAIN MENU',
      () => UIHelper.fadeToScene(this, 'MenuScene'),
      { width: 200, fontSize: '15px' }
    );

    UIHelper.createButton(
      this,
      GAME_WIDTH / 2,
      650,
      '🎯  CHANGE MODE',
      () => UIHelper.fadeToScene(this, 'ModeScene'),
      { width: 200, height: 44, fontSize: '14px' }
    );
  }

  async handleSubmit() {
    if (this.scoreSubmitted) {
      this.statusText.setText('Score already submitted!');
      return;
    }

    if (!this.player) {
      this.statusText.setText('No player info found.');
      this.statusText.setColor('#e74c3c');
      return;
    }

    if (!isFirebaseConfigured()) {
      this.statusText.setText('Firebase not configured. See firebase.js');
      this.statusText.setColor('#e74c3c');
      return;
    }

    this.statusText.setText('Submitting...');
    this.statusText.setColor(COLORS.textMuted);

    const modeInfo = Object.values(MODES).find((m) => m.id === this.mode);

    const id = await submitScore({
      name: this.player.name,
      department: this.player.department,
      year: this.player.year,
      score: this.score,
      mode: modeInfo?.name || this.mode,
    });

    if (id) {
      this.scoreSubmitted = true;
      this.statusText.setText('✅ Score submitted to leaderboard!');
      this.statusText.setColor('#2ecc71');
    } else {
      this.statusText.setText('❌ Submit failed. Check Firebase config.');
      this.statusText.setColor('#e74c3c');
    }
  }
}
