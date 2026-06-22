import { GAME_WIDTH, GAME_HEIGHT, MODES, COLORS, ROLES } from '../config/constants.js';
import { getPlayer, getBestScores } from '../utils/storage.js';
import { UIHelper } from '../utils/UIHelper.js';

/**
 * ModeScene — Card-based mode selection.
 */
export class ModeScene extends Phaser.Scene {
  constructor() {
    super({ key: 'ModeScene' });
  }

  create() {
    this._navigating = false;
    UIHelper.setVideoBackground(this);
    UIHelper.createGlassOverlay(this, 0.12);
    UIHelper.fadeIn(this);
    UIHelper.createBackgroundParticles(this, 6);

    UIHelper.createTitle(this, 55, 'Choose Your Mode', 'Learn • Play • Compete');

    const player = getPlayer();
    if (player) {
      const roleIcon = player.role === ROLES.LECTURER ? '👨‍🏫' : '🎓';
      const yearStr = player.role === ROLES.LECTURER ? 'Lecturer' : player.year;
      this.add.text(GAME_WIDTH / 2, 105, `${roleIcon} ${player.name} · ${player.department} · ${yearStr}`, {
        fontFamily: 'Inter', fontSize: '11px', color: COLORS.textMuted,
      }).setOrigin(0.5);
    }

    const bests = getBestScores();
    const modes = [MODES.FLAPPY_CST, MODES.JOURNEY, MODES.DEPARTMENT];
    const startY = 155;
    const cardGap = 155;

    modes.forEach((mode, idx) => {
      this.createModeCard(GAME_WIDTH / 2, startY + idx * cardGap, mode, bests[mode.id] || 0);
    });

    UIHelper.createButton(this, GAME_WIDTH / 2, GAME_HEIGHT - 50, '←  BACK TO MENU', () => {
      UIHelper.goToScene(this, 'MenuScene');
    }, { width: 200, height: 44, fontSize: '14px' });
  }

  createModeCard(x, y, mode, bestScore) {
    const cardW = GAME_WIDTH - 50;
    const cardH = 130;

    const container = this.add.container(x, y).setDepth(10);
    const bg = this.add
      .rectangle(0, 0, cardW, cardH, 0xffffff, 0.12)
      .setStrokeStyle(2, mode.color, 0.55);
    const accent = this.add.rectangle(-cardW / 2 + 4, 0, 6, cardH - 20, mode.color, 0.85);

    container.add([
      bg, accent,
      this.add.text(-cardW / 2 + 40, -10, mode.emoji, { fontSize: '36px' }).setOrigin(0.5),
      this.add.text(-cardW / 2 + 80, -25, mode.name, {
        fontFamily: 'Orbitron', fontSize: '16px', color: COLORS.white, fontStyle: 'bold',
      }).setOrigin(0, 0.5),
      this.add.text(-cardW / 2 + 80, 0, mode.subtitle, {
        fontFamily: 'Inter', fontSize: '11px', color: COLORS.silver,
      }).setOrigin(0, 0.5),
      this.add.text(-cardW / 2 + 80, 22, mode.description, {
        fontFamily: 'Inter', fontSize: '10px', color: COLORS.textMuted, wordWrap: { width: cardW - 120 },
      }).setOrigin(0, 0),
      this.add.text(cardW / 2 - 20, -30, `Best: ${bestScore}`, {
        fontFamily: 'Orbitron', fontSize: '11px', color: COLORS.gold,
      }).setOrigin(1, 0.5),
      this.add.text(cardW / 2 - 20, 25, 'PLAY ▶', {
        fontFamily: 'Orbitron', fontSize: '14px', color: COLORS.gold, fontStyle: 'bold',
      }).setOrigin(1, 0.5),
    ]);

    container.setSize(cardW, cardH);
    container.setInteractive(
      new Phaser.Geom.Rectangle(-cardW / 2, -cardH / 2, cardW, cardH),
      Phaser.Geom.Rectangle.Contains
    );
    if (container.input) container.input.cursor = 'pointer';

    container.on('pointerover', () => {
      this.tweens.add({ targets: container, scaleX: 1.03, scaleY: 1.03, duration: 200, ease: 'Back.easeOut' });
      bg.setFillStyle(0xffffff, 0.2);
    });
    container.on('pointerout', () => {
      this.tweens.add({ targets: container, scaleX: 1, scaleY: 1, duration: 200 });
      bg.setFillStyle(0xffffff, 0.12);
    });
    container.on('pointerup', () => {
      UIHelper.goToScene(this, 'GameScene', { mode: mode.id });
    });
  }
}
