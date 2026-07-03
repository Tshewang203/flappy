import { GAME_WIDTH, GAME_HEIGHT, COLORS, GAME_TITLE, GAME_TAGLINE } from '../config/constants.js';
import { getPlayer, isMusicEnabled, isSfxEnabled, setMusicEnabled, setSfxEnabled, getAvatar } from '../utils/storage.js';
import { getRandomCSTMessage } from '../utils/achievements.js';
import { UIHelper } from '../utils/UIHelper.js';
import { AudioManager } from '../utils/audio.js';

/**
 * MenuScene — Transparent glass UI over campus video.
 */
export class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' });
  }

  create() {
    this._navigating = false;

    UIHelper.setVideoBackground(this);
    UIHelper.createGlassOverlay(this, 0.1);
    UIHelper.fadeIn(this);
    UIHelper.createBackgroundParticles(this, 6);

    const logoKey = this.textures.exists('cst_logo') ? 'cst_logo' : 'logo';
    const logo = this.add.image(GAME_WIDTH / 2, 100, logoKey).setDisplaySize(80, 80).setDepth(10);
    this.tweens.add({
      targets: logo, y: logo.y - 6, duration: 2000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    UIHelper.createTitle(this, 175, GAME_TITLE, GAME_TAGLINE, 10);

    this.add.text(GAME_WIDTH / 2, 250, '🥈 25th SILVER JUBILEE 🥈', {
      fontFamily: 'Orbitron', fontSize: '16px', color: COLORS.gold,
    }).setOrigin(0.5).setDepth(10).setShadow(0, 1, '#000', 4, true, true);

    UIHelper.createButton(this, GAME_WIDTH / 2, 310, '▶  PLAY', () => {
      const player = getPlayer();
      if (player?.name) {
        UIHelper.goToScene(this, 'ModeScene');
      } else {
        UIHelper.goToScene(this, 'PlayerInfoScene');
      }
    }, { depth: 10 });

    UIHelper.createButton(this, GAME_WIDTH / 2, 365, '🏛️  HALL OF FAME', () => {
      UIHelper.goToScene(this, 'HallOfFameScene');
    }, { depth: 10, width: 240 });

    UIHelper.createButton(this, GAME_WIDTH / 2, 420, '🏆  LEADERBOARD', () => {
      UIHelper.goToScene(this, 'LeaderboardScene');
    }, { depth: 10 });

    // Sound settings panel
    this.add.text(GAME_WIDTH / 2, 468, '🎧 Sound Settings', {
      fontFamily: 'Orbitron', fontSize: '13px', color: COLORS.silver,
    }).setOrigin(0.5).setDepth(10);

    this.musicOn = isMusicEnabled();
    this.sfxOn = isSfxEnabled();

    const musicBtn = UIHelper.createButton(
      this, GAME_WIDTH / 2 - 95, 505,
      this.musicOn ? '🎵 Music ON' : '🎵 Music OFF',
      () => {
        this.musicOn = !this.musicOn;
        setMusicEnabled(this.musicOn);
        musicBtn.text.setText(this.musicOn ? '🎵 Music ON' : '🎵 Music OFF');
        if (!this.musicOn) AudioManager.stopBGM(this);
      },
      { width: 170, height: 40, fontSize: '12px', depth: 10 }
    );

    const sfxBtn = UIHelper.createButton(
      this, GAME_WIDTH / 2 + 95, 505,
      this.sfxOn ? '🔊 FX ON' : '🔇 FX OFF',
      () => {
        this.sfxOn = !this.sfxOn;
        setSfxEnabled(this.sfxOn);
        sfxBtn.text.setText(this.sfxOn ? '🔊 FX ON' : '🔇 FX OFF');
      },
      { width: 170, height: 40, fontSize: '12px', depth: 10 }
    );

    const player = getPlayer();
    if (player?.name) {
      const roleIcon = player.role === 'lecturer' ? '👨‍🏫' : '🎓';
      const yearStr = player.role === 'lecturer' ? 'Lecturer' : player.year;

      this.add.text(GAME_WIDTH / 2, 555, `${roleIcon} ${player.name} · ${player.department} · ${yearStr}`, {
        fontFamily: 'Inter', fontSize: '13px', color: 'rgba(255,255,255,0.9)',
      }).setOrigin(0.5).setDepth(10).setShadow(0, 1, '#000', 3, true, true);

      const avatar = getAvatar();
      if (avatar) {
        const key = 'menu_avatar';
        if (this.textures.exists(key)) this.textures.remove(key);
        this.textures.addBase64(key, avatar);
        this.add.image(GAME_WIDTH / 2 - 160, 555, key).setDisplaySize(28, 28).setDepth(10);
      }

      UIHelper.createButton(this, GAME_WIDTH / 2, 600, 'Change Player', () => {
        UIHelper.goToScene(this, 'PlayerInfoScene', { changePlayer: true });
      }, { width: 180, height: 38, fontSize: '12px', depth: 10 });
    }

    const cstMsg = getRandomCSTMessage();
    if (cstMsg) {
      this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 55, `💬 "${cstMsg.text}"`, {
        fontFamily: 'Inter', fontSize: '11px', color: 'rgba(255,255,255,0.7)',
        wordWrap: { width: GAME_WIDTH - 40 }, align: 'center',
      }).setOrigin(0.5).setDepth(10);
    }

    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 25, 'College of Science & Technology', {
      fontFamily: 'Inter', fontSize: '12px', color: 'rgba(255,255,255,0.6)',
    }).setOrigin(0.5).setDepth(10);
  }
}

