import { GAME_WIDTH, GAME_HEIGHT, COLORS, GAME_TITLE, GAME_TAGLINE } from '../config/constants.js';
import { UIHelper } from '../utils/UIHelper.js';
import { AudioManager } from '../utils/audio.js';
import { loadOptionalImages } from '../utils/assets.js';

/**
 * IntroScene — Cinematic start: video + logo fade-in → Menu.
 */
export class IntroScene extends Phaser.Scene {
  constructor() {
    super({ key: 'IntroScene' });
  }

  create() {
    this._navigating = false;
    UIHelper.setVideoBackground(this);
    UIHelper.createGlassOverlay(this, 0.1);
    UIHelper.fadeIn(this, 400);
    loadOptionalImages(this);

    const logoKey = this.textures.exists('cst_logo') ? 'cst_logo' : 'logo';
    const logo = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 80, logoKey)
      .setDisplaySize(120, 120).setDepth(10).setAlpha(0).setScale(0.5);

    const title = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 30, GAME_TITLE, {
      fontFamily: 'Orbitron', fontSize: '26px', color: COLORS.white, fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(10).setAlpha(0);

    const tagline = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 70, GAME_TAGLINE, {
      fontFamily: 'Inter', fontSize: '14px', color: COLORS.gold,
    }).setOrigin(0.5).setDepth(10).setAlpha(0);

    const jubilee = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 105, '🥈 25th Silver Jubilee 🥈', {
      fontFamily: 'Orbitron', fontSize: '13px', color: COLORS.silver,
    }).setOrigin(0.5).setDepth(10).setAlpha(0);

    this.tweens.add({
      targets: logo, alpha: 1, scaleX: 1, scaleY: 1, duration: 1200, ease: 'Back.easeOut',
    });
    this.tweens.add({ targets: title, alpha: 1, duration: 800, delay: 600 });
    this.tweens.add({ targets: tagline, alpha: 1, duration: 800, delay: 900 });
    this.tweens.add({ targets: jubilee, alpha: 1, duration: 800, delay: 1100 });

    const tapHint = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 80, 'Tap anywhere to continue', {
      fontFamily: 'Inter', fontSize: '13px', color: COLORS.textMuted,
    }).setOrigin(0.5).setDepth(20).setAlpha(0);

    this.tweens.add({
      targets: tapHint, alpha: { from: 0.4, to: 1 }, duration: 900, delay: 800, yoyo: true, repeat: -1,
    });

    UIHelper.createTapZone(this, () => this.goToMenu(), 50);
    AudioManager.play(this, 'achievement', { volume: 0.3 });
  }

  goToMenu() {
    if (this._navigating) return;
    AudioManager.playClick(this);
    UIHelper.goToScene(this, 'MenuScene');
  }
}
