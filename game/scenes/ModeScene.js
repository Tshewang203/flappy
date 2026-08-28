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
      const roleIcon = player.role === ROLES.LECTURER ? '👨‍🏫' : '🎓';
      const yearStr = player.role === ROLES.LECTURER ? 'Lecturer' : player.year;
      this.add.text(GAME_WIDTH / 2, 122, `${roleIcon} ${player.name} · ${player.department} · ${yearStr}`, {
        fontFamily: 'Inter', fontSize: '14px', color: 'rgba(255,255,255,0.92)',
      }).setOrigin(0.5).setShadow(0, 1, '#000000', 4, true, true);
    }

    const bests = getBestScores();
    const modes = [MODES.FLAPPY_CST, MODES.JOURNEY, MODES.DEPARTMENT, MODES.STORY];
    const startY = 200;
    const cardGap = 112;

    modes.forEach((mode, idx) => {
      this.createModeCard(GAME_WIDTH / 2, startY + idx * cardGap, mode, bests[mode.id] || 0);
    });

    UIHelper.createButton(this, GAME_WIDTH / 2, GAME_HEIGHT - 50, '←  BACK TO MENU', () => {
      UIHelper.goToScene(this, 'MenuScene');
    }, { width: 220, height: 46, fontSize: '16px' });
  }

  createModeIcon(x, y, mode) {
    const glow = this.add.circle(x, y, 34, mode.color, 0.1);
    const ring = this.add.circle(x, y, 28, mode.color, 0.3).setStrokeStyle(2, mode.color, 0.95);
    const symbol = this.add.text(x, y - 1, mode.icon, { fontSize: '30px' }).setOrigin(0.5);
    const badge = this.add.text(x + 14, y - 16, mode.iconBadge, { fontSize: '15px' }).setOrigin(0.5);

    this.tweens.add({
      targets: symbol,
      y: y - 5,
      duration: 1400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    this.tweens.add({
      targets: badge,
      scale: { from: 1, to: 1.2 },
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    return [glow, ring, symbol, badge];
  }

  createModeCard(x, y, mode, bestScore) {
    const cardW = GAME_WIDTH - 50;
    const cardH = 104;
    const iconX = -cardW / 2 + 44;

    const container = this.add.container(x, y).setDepth(10);

    const bg = this.add
      .rectangle(0, 0, cardW, cardH, 0xffffff, 0.12)
      .setStrokeStyle(2, mode.color, 0.55);
    const accent = this.add.rectangle(-cardW / 2 + 4, 0, 6, cardH - 20, mode.color, 0.85);

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
      this.add.text(cardW / 2 - 20, 22, 'PLAY ▶', {
        fontFamily: 'Orbitron', fontSize: '16px', color: COLORS.gold, fontStyle: 'bold',
      }).setOrigin(1, 0.5),
    ];

    const hitZone = this.add
      .rectangle(0, 0, cardW, cardH, 0x000000, 0.001)
      .setInteractive({ useHandCursor: true });

    container.add([bg, accent, ...iconParts, ...texts, hitZone]);

    const launch = () => {
      if (this._navigating) return;
      AudioManager.resume();
      AudioManager.playClick(this);
      UIHelper.goToScene(this, 'GameScene', { mode: mode.id });
    };

    hitZone.on('pointerover', () => {
      this.tweens.add({ targets: container, scaleX: 1.03, scaleY: 1.03, duration: 200, ease: 'Back.easeOut' });
      bg.setFillStyle(0xffffff, 0.22);
    });
    hitZone.on('pointerout', () => {
      this.tweens.add({ targets: container, scaleX: 1, scaleY: 1, duration: 200 });
      bg.setFillStyle(0xffffff, 0.12);
    });
    hitZone.on('pointerup', launch);
  }
}
