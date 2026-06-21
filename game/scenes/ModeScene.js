import { GAME_WIDTH, GAME_HEIGHT, MODES, COLORS } from '../config/constants.js';
import { getPlayer, getBestScores } from '../utils/storage.js';
import { UIHelper } from '../utils/UIHelper.js';

/**
 * ModeScene — Card-based mode selection screen.
 */
export class ModeScene extends Phaser.Scene {
  constructor() {
    super({ key: 'ModeScene' });
  }

  create() {
    UIHelper.fadeIn(this);
    UIHelper.createBackgroundParticles(this, 15);

    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x0f1f33, 0.5);

    UIHelper.createTitle(this, 60, 'Choose Your Journey', 'Select a game mode');

    const player = getPlayer();
    if (player) {
      this.add
        .text(GAME_WIDTH / 2, 110, `${player.name} · ${player.department} · ${player.year}`, {
          fontFamily: 'Inter',
          fontSize: '12px',
          color: COLORS.textMuted,
        })
        .setOrigin(0.5);
    }

    const bests = getBestScores();
    const modes = [MODES.FLAPPY_CST, MODES.JOURNEY, MODES.HACKATHON];
    const startY = 170;
    const cardGap = 155;

    modes.forEach((mode, idx) => {
      this.createModeCard(
        GAME_WIDTH / 2,
        startY + idx * cardGap,
        mode,
        bests[mode.id] || 0
      );
    });

    // Back button
    UIHelper.createButton(
      this,
      GAME_WIDTH / 2,
      GAME_HEIGHT - 50,
      '←  BACK TO MENU',
      () => UIHelper.fadeToScene(this, 'MenuScene'),
      { width: 200, height: 44, fontSize: '14px' }
    );
  }

  createModeCard(x, y, mode, bestScore) {
    const container = this.add.container(x, y);
    const cardW = GAME_WIDTH - 50;
    const cardH = 130;

    const bg = this.add
      .image(0, 0, 'card_bg')
      .setDisplaySize(cardW, cardH)
      .setTint(mode.color)
      .setAlpha(0.85);

    // Left accent bar
    const accent = this.add.rectangle(-cardW / 2 + 4, 0, 6, cardH - 20, mode.color, 1);

    const emoji = this.add
      .text(-cardW / 2 + 40, -10, mode.emoji, { fontSize: '36px' })
      .setOrigin(0.5);

    const title = this.add
      .text(-cardW / 2 + 80, -25, mode.name, {
        fontFamily: 'Orbitron',
        fontSize: '17px',
        color: COLORS.white,
        fontStyle: 'bold',
      })
      .setOrigin(0, 0.5);

    const subtitle = this.add
      .text(-cardW / 2 + 80, 0, mode.subtitle, {
        fontFamily: 'Inter',
        fontSize: '12px',
        color: COLORS.silver,
      })
      .setOrigin(0, 0.5);

    const desc = this.add
      .text(-cardW / 2 + 80, 25, mode.description, {
        fontFamily: 'Inter',
        fontSize: '11px',
        color: COLORS.textMuted,
        wordWrap: { width: cardW - 120 },
      })
      .setOrigin(0, 0);

    const best = this.add
      .text(cardW / 2 - 20, -30, `Best: ${bestScore}`, {
        fontFamily: 'Orbitron',
        fontSize: '12px',
        color: COLORS.gold,
      })
      .setOrigin(1, 0.5);

    const playBtn = this.add
      .text(cardW / 2 - 20, 25, 'PLAY ▶', {
        fontFamily: 'Orbitron',
        fontSize: '14px',
        color: COLORS.gold,
        fontStyle: 'bold',
      })
      .setOrigin(1, 0.5);

    container.add([bg, accent, emoji, title, subtitle, desc, best, playBtn]);
    container.setSize(cardW, cardH);

    // Make interactive
    bg.setInteractive({ useHandCursor: true });

    bg.on('pointerover', () => {
      this.tweens.add({
        targets: container,
        scaleX: 1.03,
        scaleY: 1.03,
        duration: 200,
        ease: 'Back.easeOut',
      });
      bg.setAlpha(1);
    });

    bg.on('pointerout', () => {
      this.tweens.add({
        targets: container,
        scaleX: 1,
        scaleY: 1,
        duration: 200,
      });
      bg.setAlpha(0.85);
    });

    bg.on('pointerdown', () => {
      this.tweens.add({
        targets: container,
        scaleX: 0.97,
        scaleY: 0.97,
        duration: 100,
        yoyo: true,
        onComplete: () => {
          UIHelper.fadeToScene(this, 'GameScene', { mode: mode.id });
        },
      });
    });
  }
}
