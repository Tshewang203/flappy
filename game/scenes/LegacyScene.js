import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../config/constants.js';
import { AudioManager } from '../utils/audio.js';

/**
 * LegacyScene — CST timeline slide overlay at score milestones.
 */
export class LegacyScene extends Phaser.Scene {
  constructor() {
    super({ key: 'LegacyScene' });
  }

  init(data) {
    this.moment = data.moment;
  }

  create() {
    AudioManager.play(this, 'legacy');

    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x004f8a, 0.92)
      .setDepth(0).setInteractive();

    const cardY = GAME_HEIGHT / 2;

    // Silver glow border
    this.add.rectangle(GAME_WIDTH / 2, cardY, GAME_WIDTH - 30, 380, 0x0067b1, 0.6)
      .setStrokeStyle(3, 0xffd700, 0.8).setDepth(1);

    this.add.text(GAME_WIDTH / 2, cardY - 150, '✦ CST LEGACY MOMENT ✦', {
      fontFamily: 'Orbitron', fontSize: '16px', color: COLORS.gold, fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(2);

    this.add.text(GAME_WIDTH / 2, cardY - 100, this.moment.emoji, { fontSize: '56px' })
      .setOrigin(0.5).setDepth(2);

    this.add.text(GAME_WIDTH / 2, cardY - 35, this.moment.year, {
      fontFamily: 'Orbitron', fontSize: '36px', color: COLORS.gold, fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(2).setShadow(0, 0, '#ffd700', 8, true, true);

    this.add.text(GAME_WIDTH / 2, cardY + 15, this.moment.title, {
      fontFamily: 'Orbitron', fontSize: '22px', color: COLORS.white, fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(2);

    this.add.text(GAME_WIDTH / 2, cardY + 70, this.moment.description, {
      fontFamily: 'Inter', fontSize: '14px', color: COLORS.textMuted,
      wordWrap: { width: GAME_WIDTH - 70 }, align: 'center',
    }).setOrigin(0.5).setDepth(2);

    const continueText = this.add.text(GAME_WIDTH / 2, cardY + 155, 'Tap to continue ▶', {
      fontFamily: 'Orbitron', fontSize: '14px', color: COLORS.silver,
    }).setOrigin(0.5).setDepth(2);

    this.tweens.add({
      targets: continueText, alpha: { from: 0.5, to: 1 }, duration: 700, yoyo: true, repeat: -1,
    });

    this.time.delayedCall(800, () => {
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
