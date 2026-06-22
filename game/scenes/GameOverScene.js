import { GAME_WIDTH, GAME_HEIGHT, COLORS, MODES, ROLES } from '../config/constants.js';
import { updateBestScore, getBestScores, getAvatar } from '../utils/storage.js';
import { submitScore, isFirebaseConfigured } from '../firebase.js';
import { recordGameEnd, saveCSTMessage } from '../utils/achievements.js';
import { UIHelper } from '../utils/UIHelper.js';
import { AudioManager } from '../utils/audio.js';

/**
 * GameOverScene — Score, achievements, CST message, submit score.
 */
export class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameOverScene' });
  }

  init(data) {
    this.score = data.score || 0;
    this.mode = data.mode || 'flappy_cst';
    this.player = data.player;
    this.legacyTriggered = data.legacyTriggered || false;
    this.isNewBest = updateBestScore(this.mode, this.score);
    this.scoreSubmitted = false;
    this.newAchievements = recordGameEnd({
      score: this.score,
      mode: this.mode,
      legacyTriggered: this.legacyTriggered,
    });
  }

  create() {
    UIHelper.setOpaqueBackground(this);
    UIHelper.fadeIn(this);
    AudioManager.play(this, 'gameover', { volume: 0.45 });

    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x004f8a, 0.82);

    const logoKey = this.textures.exists('cst_logo') ? 'cst_logo' : 'logo';
    this.add.image(GAME_WIDTH / 2, 45, logoKey).setDisplaySize(45, 45);

    const modeInfo = Object.values(MODES).find((m) => m.id === this.mode);

    this.add.text(GAME_WIDTH / 2, 85, 'GAME OVER', {
      fontFamily: 'Orbitron', fontSize: '30px', color: '#e74c3c', fontStyle: 'bold',
    }).setOrigin(0.5).setShadow(0, 0, '#e74c3c', 6, true, true);

    this.add.text(GAME_WIDTH / 2, 118, `${modeInfo?.emoji || ''} ${modeInfo?.name || ''}`, {
      fontFamily: 'Inter', fontSize: '12px', color: COLORS.textMuted,
    }).setOrigin(0.5);

    const cardY = 195;
    this.add.image(GAME_WIDTH / 2, cardY, 'card_bg').setDisplaySize(340, 140).setAlpha(0.9);

    const avatar = getAvatar();
    if (avatar) {
      const key = 'go_avatar';
      if (this.textures.exists(key)) this.textures.remove(key);
      this.textures.addBase64(key, avatar);
      this.add.image(GAME_WIDTH / 2, cardY - 50, key).setDisplaySize(40, 40);
    }

    this.add.text(GAME_WIDTH / 2, cardY - 12, 'SCORE', {
      fontFamily: 'Orbitron', fontSize: '12px', color: COLORS.textMuted,
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, cardY + 22, String(this.score), {
      fontFamily: 'Orbitron', fontSize: '48px', color: COLORS.gold, fontStyle: 'bold',
    }).setOrigin(0.5);

    const bests = getBestScores();
    this.add.text(GAME_WIDTH / 2, cardY + 58, `Best: ${bests[this.mode] || 0}`, {
      fontFamily: 'Orbitron', fontSize: '14px', color: COLORS.silver,
    }).setOrigin(0.5);

    if (this.isNewBest) {
      this.add.text(GAME_WIDTH / 2, cardY + 78, '🎉 NEW BEST!', {
        fontFamily: 'Orbitron', fontSize: '12px', color: COLORS.gold,
      }).setOrigin(0.5);
    }

    if (this.newAchievements.length > 0) {
      AudioManager.play(this, 'achievement');
      const badges = this.newAchievements.map((a) => `${a.emoji} ${a.name}`).join('  ');
      this.add.text(GAME_WIDTH / 2, 280, `🏅 ${badges}`, {
        fontFamily: 'Inter', fontSize: '10px', color: COLORS.gold,
        wordWrap: { width: GAME_WIDTH - 40 }, align: 'center',
      }).setOrigin(0.5);
    }

    if (this.player) {
      const roleIcon = this.player.role === ROLES.LECTURER ? '👨‍🏫' : '🎓';
      const yearStr = this.player.role === ROLES.LECTURER ? 'Lecturer' : this.player.year;
      this.add.text(GAME_WIDTH / 2, 310, `${roleIcon} ${this.player.name} · ${this.player.department} · ${yearStr}`, {
        fontFamily: 'Inter', fontSize: '10px', color: COLORS.textMuted,
      }).setOrigin(0.5);
    }

    // Message to CST
    this.add.text(GAME_WIDTH / 2, 335, '💬 Message to CST (optional)', {
      fontFamily: 'Inter', fontSize: '10px', color: COLORS.silver,
    }).setOrigin(0.5);

    this.messageInput = this.createMessageField(GAME_WIDTH / 2, 360, 'Proud to be part of CST ❤️');

    this.statusText = this.add.text(GAME_WIDTH / 2, 395, '', {
      fontFamily: 'Inter', fontSize: '10px', color: COLORS.textMuted,
    }).setOrigin(0.5);

    UIHelper.createButton(this, GAME_WIDTH / 2, 435, '🔄  RESTART', () => {
      this.saveMessageIfAny();
<<<<<<< HEAD

      // Force a clean GameScene restart to avoid lingering paused physics/state.
      if (this.scene.isActive('GameScene')) this.scene.stop('GameScene');
      this.scene.start('GameScene', { mode: this.mode });
=======
      ['UIScene', 'QuizScene', 'LegacyScene'].forEach((key) => {
        if (this.scene.isActive(key)) this.scene.stop(key);
      });
      UIHelper.fadeToScene(this, 'GameScene', { mode: this.mode });
>>>>>>> 72b441b (Updated web application)
    }, { navigate: true });

    UIHelper.createButton(this, GAME_WIDTH / 2, 490, '📤  SUBMIT SCORE', () => this.handleSubmit());

    UIHelper.createButton(this, GAME_WIDTH / 2, 545, '🏛️  HALL OF FAME', () => {
      UIHelper.fadeToScene(this, 'HallOfFameScene');
    }, { width: 200, fontSize: '13px', navigate: true });

    UIHelper.createButton(this, GAME_WIDTH / 2, 600, '🏠  MAIN MENU', () => {
      this.saveMessageIfAny();
      UIHelper.fadeToScene(this, 'MenuScene');
    }, { width: 200, height: 40, fontSize: '13px', navigate: true });

    UIHelper.createButton(this, GAME_WIDTH / 2, 655, '🎯  CHANGE MODE', () => {
      this.saveMessageIfAny();
      UIHelper.fadeToScene(this, 'ModeScene');
    }, { width: 200, height: 38, fontSize: '12px', navigate: true });
  }

  createMessageField(x, y, placeholder) {
    const canvas = this.game.canvas;
    const rect = canvas.getBoundingClientRect();
    const scaleX = rect.width / GAME_WIDTH;
    const scaleY = rect.height / GAME_HEIGHT;
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = placeholder;
    input.maxLength = 80;
    input.style.cssText = `
      position: absolute;
      left: ${rect.left + (x - 150) * scaleX}px;
      top: ${rect.top + (y - 14) * scaleY}px;
      width: ${300 * scaleX}px;
      height: ${28 * scaleY}px;
      background: rgba(0, 103, 177, 0.6);
      border: 1px solid rgba(0, 148, 219, 0.5);
      border-radius: 8px;
      color: #fff;
      font-family: Inter, sans-serif;
      font-size: ${11 * scaleY}px;
      padding: 0 10px;
      outline: none;
      text-align: center;
      z-index: 10;
    `;
    document.body.appendChild(input);
    this.events.on('shutdown', () => input.remove());
    this.events.on('destroy', () => input.remove());
    return input;
  }

  saveMessageIfAny() {
    const msg = this.messageInput?.value?.trim();
    if (msg && msg.length >= 3) saveCSTMessage(msg);
  }

  async handleSubmit() {
    this.saveMessageIfAny();
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
    const modeInfo = Object.values(MODES).find((m) => m.id === this.mode);

    const id = await submitScore({
      name: this.player.name,
      role: this.player.role || ROLES.STUDENT,
      department: this.player.department,
      year: this.player.year,
      score: this.score,
      mode: modeInfo?.name || this.mode,
    });

    if (id) {
      this.scoreSubmitted = true;
      this.statusText.setText('✅ Score submitted!');
      this.statusText.setColor('#2ecc71');
    } else {
      this.statusText.setText('❌ Submit failed.');
      this.statusText.setColor('#e74c3c');
    }
  }
}
