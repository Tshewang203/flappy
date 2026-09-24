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
    UIHelper.createGlassOverlay(this, 0.25);
    UIHelper.fadeIn(this, 400);
    loadOptionalImages(this);

    const centerY = GAME_HEIGHT / 2 - 30;

    // Glass card grouping the branding, so it reads as a designed panel, not loose text on a photo.
    const card = this.add.rectangle(GAME_WIDTH / 2, centerY, 460, 320, 0x0a1e33, 0.55)
      .setStrokeStyle(2, COLORS.gold, 0.5)
      .setDepth(5)
      .setAlpha(0);
    this.tweens.add({ targets: card, alpha: 1, duration: 600 });

    const logoKey = this.textures.exists('cst_logo') ? 'cst_logo' : 'logo';
    const logoGlow = this.add.circle(GAME_WIDTH / 2, centerY - 100, 66, 0xffffff, 0.15)
      .setDepth(9).setAlpha(0);
    const logo = this.add.image(GAME_WIDTH / 2, centerY - 100, logoKey)
      .setDisplaySize(120, 120)
      .setDepth(10)
      .setAlpha(0)
      .setScale(0.5);

    const title = this.add.text(GAME_WIDTH / 2, centerY + 40, GAME_TITLE, {
      fontFamily: 'Orbitron', fontSize: '30px', color: COLORS.white, fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(10).setAlpha(0).setShadow(0, 2, '#000', 6, true, true);

    const tagline = this.add.text(GAME_WIDTH / 2, centerY + 80, GAME_TAGLINE, {
      fontFamily: 'Inter', fontSize: '16px', color: COLORS.gold, fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(10).setAlpha(0);

    const jubileeText = this.add.text(GAME_WIDTH / 2, centerY + 115, '25th Silver Jubilee', {
      fontFamily: 'Orbitron', fontSize: '14px', color: COLORS.silverLight, fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(10).setAlpha(0);
    const jubileeIconL = UIHelper.drawIcon(this, 'star', GAME_WIDTH / 2 - jubileeText.width / 2 - 18, centerY + 115, 7, COLORS.gold, 10).setAlpha(0);
    const jubileeIconR = UIHelper.drawIcon(this, 'star', GAME_WIDTH / 2 + jubileeText.width / 2 + 18, centerY + 115, 7, COLORS.gold, 10).setAlpha(0);

    this.tweens.add({
      targets: logo, alpha: 1, scaleX: 1, scaleY: 1, duration: 1200, ease: 'Back.easeOut',
    });
    this.tweens.add({ targets: logoGlow, alpha: 1, duration: 1200 });
    this.tweens.add({ targets: title, alpha: 1, duration: 800, delay: 600 });
    this.tweens.add({ targets: tagline, alpha: 1, duration: 800, delay: 900 });
    this.tweens.add({ targets: [jubileeText, jubileeIconL, jubileeIconR], alpha: 1, duration: 800, delay: 1100 });

    const tapBadge = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT - 80, 280, 44, 0x0a1e33, 0.7)
      .setStrokeStyle(1, COLORS.gold, 0.5)
      .setDepth(19).setAlpha(0);
    const tapHint = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 80, 'Tap anywhere to continue', {
      fontFamily: 'Inter', fontSize: '15px', color: COLORS.gold,
    }).setOrigin(0.5).setDepth(20).setAlpha(0);

    this.tweens.add({ targets: [tapBadge, tapHint], alpha: 1, duration: 400, delay: 1300 });
    this.tweens.add({
      targets: tapHint, alpha: { from: 1, to: 0.5 }, duration: 900, delay: 1700, yoyo: true, repeat: -1,
    });

    // IMPORTANT: AudioContext must start after a user gesture.
    // Trigger any SFX (including procedural fallbacks) only after tap/click.
    UIHelper.createTapZone(this, () => this.goToMenu(), 50);
  }

  goToMenu() {
    if (this._navigating) return;
    AudioManager.playClick(this);
    UIHelper.goToScene(this, 'MenuScene');
  }
}
