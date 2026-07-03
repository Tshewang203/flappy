import { GAME_WIDTH, GAME_HEIGHT, COLORS, MODES, ROLES } from '../config/constants.js';
import { updateBestScore, getBestScores, getAvatar } from '../utils/storage.js';
import { submitScore, isFirebaseConfigured } from '../firebase.js';
import { recordGameEnd, saveCSTMessage } from '../utils/achievements.js';
import { buildFaceTexture } from '../utils/avatar.js';
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
    this._navigating = false;
    UIHelper.setOpaqueBackground(this);
    UIHelper.fadeIn(this);
    AudioManager.play(this, 'gameover', { volume: 0.45 });

    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x004f8a, 0.82);

    const logoKey = this.textures.exists('cst_logo') ? 'cst_logo' : 'logo';
    this.add.image(GAME_WIDTH / 2, 38, logoKey).setDisplaySize(42, 42);

    const modeInfo = Object.values(MODES).find((m) => m.id === this.mode);

    this.add.text(GAME_WIDTH / 2, 72, 'GAME OVER', {
      fontFamily: 'Orbitron', fontSize: '28px', color: '#e74c3c', fontStyle: 'bold',
    }).setOrigin(0.5).setShadow(0, 0, '#e74c3c', 6, true, true);

    this.add.text(GAME_WIDTH / 2, 102, `${modeInfo?.emoji || ''} ${modeInfo?.name || ''}`, {
      fontFamily: 'Inter', fontSize: '14px', color: COLORS.textMuted,
    }).setOrigin(0.5);

    const cardY = 168;
    this.add.image(GAME_WIDTH / 2, cardY, 'card_bg').setDisplaySize(340, 148).setAlpha(0.9);

    this.loadAvatarImage(cardY - 52);

    this.add.text(GAME_WIDTH / 2, cardY - 8, 'SCORE', {
      fontFamily: 'Orbitron', fontSize: '13px', color: COLORS.textMuted,
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, cardY + 20, String(this.score), {
      fontFamily: 'Orbitron', fontSize: '44px', color: COLORS.gold, fontStyle: 'bold',
    }).setOrigin(0.5);

    const bests = getBestScores();
    this.add.text(GAME_WIDTH / 2, cardY + 54, `Best: ${bests[this.mode] || 0}`, {
      fontFamily: 'Orbitron', fontSize: '13px', color: COLORS.silver,
    }).setOrigin(0.5);

    let nextY = cardY + 78;
    if (this.isNewBest) {
      this.add.text(GAME_WIDTH / 2, nextY, '🎉 NEW BEST!', {
        fontFamily: 'Orbitron', fontSize: '11px', color: COLORS.gold,
      }).setOrigin(0.5);
      nextY += 22;
    }

    if (this.newAchievements.length > 0) {
      AudioManager.play(this, 'achievement');
      const badges = this.newAchievements.map((a) => `${a.emoji} ${a.name}`).join('   ');
      this.add.text(GAME_WIDTH / 2, nextY + 8, badges, {
        fontFamily: 'Inter', fontSize: '13px', color: COLORS.gold,
        wordWrap: { width: GAME_WIDTH - 48 }, align: 'center',
      }).setOrigin(0.5, 0);
      nextY += 36;
    } else {
      nextY += 14;
    }

    if (this.player) {
      const roleIcon = this.player.role === ROLES.LECTURER ? '👨‍🏫' : '🎓';
      const yearStr = this.player.role === ROLES.LECTURER ? 'Lecturer' : this.player.year;
      this.add.text(GAME_WIDTH / 2, nextY, `${roleIcon} ${this.player.name}`, {
        fontFamily: 'Inter', fontSize: '13px', color: COLORS.text,
      }).setOrigin(0.5);
      this.add.text(GAME_WIDTH / 2, nextY + 18, `${this.player.department} · ${yearStr}`, {
        fontFamily: 'Inter', fontSize: '12px', color: COLORS.textMuted,
      }).setOrigin(0.5);
      nextY += 42;
    }

    this.add.text(GAME_WIDTH / 2, nextY, '💬 Message to CST (optional)', {
      fontFamily: 'Inter', fontSize: '12px', color: COLORS.silver,
    }).setOrigin(0.5);

    this.messageInput = this.createMessageField(GAME_WIDTH / 2, nextY + 28, 'Proud to be part of CST ❤️');

    this.statusText = this.add.text(GAME_WIDTH / 2, nextY + 58, '', {
      fontFamily: 'Inter', fontSize: '10px', color: COLORS.textMuted,
    }).setOrigin(0.5).setDepth(30);

    const btnStartY = nextY + 88;
    const btnGap = 48;

    UIHelper.createButton(this, GAME_WIDTH / 2, btnStartY, '🔄  RESTART', () => {
      this.saveMessageIfAny();
      ['UIScene', 'QuizScene', 'LegacyScene'].forEach((key) => {
        if (this.scene.isActive(key)) this.scene.stop(key);
      });
      if (this.scene.isActive('GameScene')) this.scene.stop('GameScene');
      UIHelper.fadeToScene(this, 'GameScene', { mode: this.mode });
    }, { depth: 25, height: 44, fontSize: '15px' });

    UIHelper.createButton(this, GAME_WIDTH / 2, btnStartY + btnGap, '📤  SUBMIT SCORE', () => {
      this.handleSubmit();
    }, { depth: 25, height: 44, fontSize: '15px' });

    UIHelper.createButton(this, GAME_WIDTH / 2, btnStartY + btnGap * 2, '🏛️  HALL OF FAME', () => {
      UIHelper.fadeToScene(this, 'HallOfFameScene');
    }, { depth: 25, width: 220, height: 42, fontSize: '13px' });

    UIHelper.createButton(this, GAME_WIDTH / 2, btnStartY + btnGap * 3, '🏠  MAIN MENU', () => {
      this.saveMessageIfAny();
      UIHelper.fadeToScene(this, 'MenuScene');
    }, { depth: 25, width: 220, height: 42, fontSize: '13px' });

    UIHelper.createButton(this, GAME_WIDTH / 2, btnStartY + btnGap * 4, '🎯  CHANGE MODE', () => {
      this.saveMessageIfAny();
      UIHelper.fadeToScene(this, 'ModeScene');
    }, { depth: 25, width: 220, height: 40, fontSize: '12px' });

    this.scale.on('resize', this.repositionMessageField, this);
    this.events.once('shutdown', () => {
      this.scale.off('resize', this.repositionMessageField, this);
      this.messageInput?.remove();
    });
  }

  loadAvatarImage(y) {
    const avatar = getAvatar();
    if (!avatar) return;

    const key = 'go_avatar';
    if (this.textures.exists(key)) this.textures.remove(key);

    const ring = this.add.circle(GAME_WIDTH / 2, y, 26, 0x1e3a5f)
      .setStrokeStyle(2, 0xc0c0c0, 0.7)
      .setDepth(4);

    buildFaceTexture(this, avatar, key)
      .then(() => {
        if (!this.scene.isActive('GameOverScene')) return;
        this.avatarImg = this.add.image(GAME_WIDTH / 2, y, key)
          .setDisplaySize(50, 50)
          .setDepth(5);
      })
      .catch(() => {
        if (!this.scene.isActive('GameOverScene')) return;
        this.textures.addBase64(key, avatar);
        this.avatarImg = this.add.image(GAME_WIDTH / 2, y, key)
          .setDisplaySize(50, 50)
          .setDepth(5);
      });

    return ring;
  }

  createMessageField(x, y, placeholder) {
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = placeholder;
    input.maxLength = 80;
    input.className = 'game-overlay-input';
    document.body.appendChild(input);
    this.messageFieldPos = { x, y };
    this.repositionMessageField();
    this.events.on('destroy', () => input.remove());
    return input;
  }

  repositionMessageField() {
    if (!this.messageInput || !this.messageFieldPos) return;
    const canvas = this.game.canvas;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = rect.width / GAME_WIDTH;
    const scaleY = rect.height / GAME_HEIGHT;
    const { x, y } = this.messageFieldPos;
    this.messageInput.style.left = `${rect.left + (x - 140) * scaleX}px`;
    this.messageInput.style.top = `${rect.top + (y - 14) * scaleY}px`;
    this.messageInput.style.width = `${280 * scaleX}px`;
    this.messageInput.style.height = `${30 * scaleY}px`;
    this.messageInput.style.fontSize = `${12 * scaleY}px`;
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
      this.statusText.setText('Firebase not configured — score saved locally only.');
      this.statusText.setColor('#f39c12');
      return;
    }

    this.statusText.setText('Submitting...');
    this.statusText.setColor(COLORS.textMuted);
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
