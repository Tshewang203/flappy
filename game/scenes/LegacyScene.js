import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../config/constants.js';
import { AudioManager } from '../utils/audio.js';

/**
 * LegacyScene — Chronological CST timeline card (shown after Journey quizzes).
 */
export class LegacyScene extends Phaser.Scene {
  constructor() {
    super({ key: 'LegacyScene' });
  }

  init(data) {
    this.moment = data.moment;
    this.isTimeline = data.isTimeline || false;
  }

  create() {
    AudioManager.play(this, 'legacy');

    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x004f8a, 0.92)
      .setDepth(0).setInteractive();

    const cardY = GAME_HEIGHT / 2;

    this.add.rectangle(GAME_WIDTH / 2, cardY, GAME_WIDTH - 30, 400, 0x0067b1, 0.6)
      .setStrokeStyle(3, 0xffd700, 0.8).setDepth(1);

    const header = this.isTimeline ? '✦ CST TIMELINE ✦' : '✦ CST LEGACY MOMENT ✦';
    this.add.text(GAME_WIDTH / 2, cardY - 165, header, {
      fontFamily: 'Orbitron', fontSize: '16px', color: COLORS.gold, fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(2);

    if (this.moment.sequenceLabel) {
      this.add.text(GAME_WIDTH / 2, cardY - 138, this.moment.sequenceLabel, {
        fontFamily: 'Orbitron', fontSize: '13px', color: COLORS.silver,
      }).setOrigin(0.5).setDepth(2);
    }

    this.add.text(GAME_WIDTH / 2, cardY - 95, this.moment.emoji, { fontSize: '56px' })
      .setOrigin(0.5).setDepth(2);

    this.add.text(GAME_WIDTH / 2, cardY - 35, this.moment.year, {
      fontFamily: 'Orbitron', fontSize: '36px', color: COLORS.gold, fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(2).setShadow(0, 0, '#ffd700', 8, true, true);

    this.add.text(GAME_WIDTH / 2, cardY + 15, this.moment.title, {
      fontFamily: 'Orbitron', fontSize: '22px', color: COLORS.white, fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(2);

    if (this.moment.location) {
      this.add.text(GAME_WIDTH / 2, cardY + 48, `📍 ${this.moment.location}`, {
        fontFamily: 'Inter', fontSize: '12px', color: COLORS.silver,
      }).setOrigin(0.5).setDepth(2);
    }

    this.add.text(GAME_WIDTH / 2, cardY + 78, this.moment.description, {
      fontFamily: 'Inter', fontSize: '14px', color: COLORS.textMuted,
      wordWrap: { width: GAME_WIDTH - 70 }, align: 'center',
    }).setOrigin(0.5).setDepth(2);

    const continueText = this.add.text(GAME_WIDTH / 2, cardY + 165, 'Tap to continue ▶', {
      fontFamily: 'Orbitron', fontSize: '14px', color: COLORS.silver,
    }).setOrigin(0.5).setDepth(2);

    this.tweens.add({
      targets: continueText, alpha: { from: 0.5, to: 1 }, duration: 700, yoyo: true, repeat: -1,
    });

    this.time.delayedCall(2500, () => {
      this.input.once('pointerdown', () => this.close());
      this.input.keyboard?.once('keydown-SPACE', () => this.close());
    });

    this.cameras.main.fadeIn(400);
  }

  close() {
    const gameScene = this.scene.get('GameScene');
    gameScene.events.emit('legacyComplete');
    this.scene.stop('LegacyScene');
    this.scene.resume('GameScene');
  }
}
