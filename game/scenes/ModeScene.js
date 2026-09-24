import { GAME_WIDTH, GAME_HEIGHT, MODES, COLORS, ROLES } from '../config/constants.js';
import { getPlayer, getBestScores } from '../utils/storage.js';
import { UIHelper } from '../utils/UIHelper.js';
import { AudioManager } from '../utils/audio.js';

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

    UIHelper.createTitle(this, 50, 'Choose Your Mode', 'Learn • Play • Compete');

    const player = getPlayer();
    if (player) {
      const yearStr = player.role === ROLES.LECTURER
        ? 'Lecturer'
        : player.role === ROLES.ALUMNI
          ? `Batch ${player.batch}`
          : player.year;
      this.add.text(GAME_WIDTH / 2, 122, `${player.name} · ${player.department} · ${yearStr}`, {
        fontFamily: 'Inter', fontSize: '14px', color: 'rgba(255,255,255,0.92)',
      }).setOrigin(0.5).setShadow(0, 1, '#000000', 4, true, true);
    }

    const bests = getBestScores();
    // 1. Classic Mode  2. Silver Jubilee Challenge (Story + 25 Years merged)  3. Department Challenge
    const modes = [MODES.FLAPPY_CST, MODES.JOURNEY, MODES.DEPARTMENT];
    const startY = 235;
    const cardGap = 128;

    modes.forEach((mode, idx) => {
      this.createModeCard(GAME_WIDTH / 2, startY + idx * cardGap, mode, bests[mode.id] || 0);
    });

    UIHelper.createButton(this, GAME_WIDTH / 2, GAME_HEIGHT - 50, 'BACK TO MENU', () => {
      UIHelper.goToScene(this, 'MenuScene');
    }, { width: 220, height: 46, fontSize: '16px', icon: 'back' });
  }

  createModeIcon(x, y, mode) {
    const glow = this.add.circle(x, y, 34, mode.color, 0.1);
    const ring = this.add.circle(x, y, 28, mode.color, 0.3).setStrokeStyle(2, mode.color, 0.95);
    const symbol = UIHelper.drawIcon(this, mode.iconType, x, y - 1, 16, '#ffffff', 11);

    this.tweens.add({
      targets: symbol,
      y: y - 6,
      duration: 1400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    return [glow, ring, symbol];
  }

  createModeCard(x, y, mode, bestScore) {
    const cardW = GAME_WIDTH - 50;
    const cardH = 104;
    const iconX = -cardW / 2 + 44;

    const container = this.add.container(x, y).setDepth(10);

    const bg = this.add
      .rectangle(0, 0, cardW, cardH, 0x0a1e33, 0.55)
      .setStrokeStyle(2, mode.color, 0.85);
    const accent = this.add.rectangle(-cardW / 2 + 4, 0, 6, cardH - 20, mode.color, 0.95);

    const iconParts = this.createModeIcon(iconX, 0, mode);

    const texts = [
      this.add.text(-cardW / 2 + 88, -24, mode.name, {
        fontFamily: 'Orbitron', fontSize: '18px', color: COLORS.white, fontStyle: 'bold',
      }).setOrigin(0, 0.5),
      this.add.text(-cardW / 2 + 88, 0, mode.subtitle, {
        fontFamily: 'Inter', fontSize: '13px', color: COLORS.silver,
      }).setOrigin(0, 0.5),
      this.add.text(-cardW / 2 + 88, 20, mode.description, {
        fontFamily: 'Inter', fontSize: '12px', color: COLORS.textMuted, wordWrap: { width: cardW - 130 },
      }).setOrigin(0, 0),
      this.add.text(cardW / 2 - 20, -26, `Best: ${bestScore}`, {
        fontFamily: 'Orbitron', fontSize: '13px', color: COLORS.gold,
      }).setOrigin(1, 0.5),
      this.add.text(cardW / 2 - 36, 22, 'PLAY', {
        fontFamily: 'Orbitron', fontSize: '16px', color: COLORS.gold, fontStyle: 'bold',
      }).setOrigin(1, 0.5),
    ];

    const playArrow = UIHelper.drawIcon(this, 'forward', cardW / 2 - 12, 22, 9, COLORS.gold, 11);

    const hitZone = this.add
      .rectangle(0, 0, cardW, cardH, 0x000000, 0.001)
      .setInteractive({ useHandCursor: true });

    container.add([bg, accent, ...iconParts, ...texts, playArrow, hitZone]);

    const launch = () => {
      if (this._navigating) return;
      AudioManager.resume();
      AudioManager.playClick(this);
      UIHelper.goToScene(this, 'GameScene', { mode: mode.id });
    };

    hitZone.on('pointerover', () => {
      this.tweens.add({ targets: container, scaleX: 1.03, scaleY: 1.03, duration: 200, ease: 'Back.easeOut' });
      bg.setFillStyle(0x0a1e33, 0.8);
      bg.setStrokeStyle(2, mode.color, 1);
    });
    hitZone.on('pointerout', () => {
      this.tweens.add({ targets: container, scaleX: 1, scaleY: 1, duration: 200 });
      bg.setFillStyle(0x0a1e33, 0.55);
      bg.setStrokeStyle(2, mode.color, 0.85);
    });
    hitZone.on('pointerup', launch);
  }
}
