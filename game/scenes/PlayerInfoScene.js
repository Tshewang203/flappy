import { GAME_WIDTH, GAME_HEIGHT, DEPARTMENTS, YEARS, COLORS, ROLES, AVATAR_STYLES } from '../config/constants.js';
import { getPlayer, savePlayer, clearPlayer, getAvatar } from '../utils/storage.js';
import { openCameraCapture, openImageUpload, clearAvatar } from '../utils/avatar.js';
import { UIHelper } from '../utils/UIHelper.js';

/**
 * PlayerInfoScene — Name, role, department, year, and avatar capture.
 */
export class PlayerInfoScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PlayerInfoScene' });
  }

  init(data) {
    this.changePlayer = data?.changePlayer || false;
  }

  create() {
    this._navigating = false;
    this.changePlayer = this.changePlayer || false;

    UIHelper.setVideoBackground(this);
    UIHelper.createGlassOverlay(this, 0.15);
    UIHelper.fadeIn(this);

    UIHelper.createTitle(this, 55, 'Player Info', 'Enter your details to play');

    const existing = getPlayer();
    this.role = existing?.role || ROLES.STUDENT;
    this.deptIndex = existing ? Math.max(0, DEPARTMENTS.indexOf(existing.department)) : 0;
    this.yearIndex = existing ? Math.max(0, YEARS.indexOf(existing.year)) : 0;
    this.avatarData = getAvatar();
    this.avatarStyleIndex = 0;
    const styles = Object.values(AVATAR_STYLES);
    if (existing?.avatarStyle) {
      const idx = styles.findIndex((s) => s.id === existing.avatarStyle);
      if (idx >= 0) this.avatarStyleIndex = idx;
    } else if (this.role === ROLES.LECTURER) {
      this.avatarStyleIndex = 1;
    }

    // ── Role toggle ──
    this.createRoleToggle(115);

    // ── Name ──
    this.createLabel(165, 'Name');
    this.nameInput = this.createInputField(GAME_WIDTH / 2, 195, existing?.name || '', 'Your name');

    // ── Department ──
    this.createLabel(235, 'Department');
    this.deptText = this.add.text(GAME_WIDTH / 2, 265, DEPARTMENTS[this.deptIndex], {
      fontFamily: 'Inter', fontSize: '13px', color: COLORS.text,
      wordWrap: { width: 260 }, align: 'center',
    }).setOrigin(0.5);
    this.createCycleArrows(265, () => this.cycleDepartment(-1), () => this.cycleDepartment(1));

    // ── Year (students only) ──
    this.yearLabel = this.createLabel(305, 'Year');
    this.yearText = this.add.text(GAME_WIDTH / 2, 335, YEARS[this.yearIndex], {
      fontFamily: 'Inter', fontSize: '15px', color: COLORS.text,
    }).setOrigin(0.5);
    this.yearArrows = this.createCycleArrows(335, () => this.cycleYear(-1), () => this.cycleYear(1));

    // ── Avatar section (compact) ──
    this.createAvatarSection(370);

    this.errorText = this.add.text(GAME_WIDTH / 2, 575, '', {
      fontFamily: 'Inter', fontSize: '12px', color: '#e74c3c',
    }).setOrigin(0.5).setVisible(false).setDepth(100);

    UIHelper.createButton(this, GAME_WIDTH / 2, 625, 'CONTINUE ▶', () => {
      this.submitPlayer();
    }, { depth: 100, width: 240 });

    if (this.changePlayer) {
      UIHelper.createButton(this, GAME_WIDTH / 2, 685, 'Clear & Go Back', () => {
        clearPlayer();
        clearAvatar();
        UIHelper.goToScene(this, 'MenuScene');
      }, { width: 200, height: 40, fontSize: '13px', depth: 100 });
    } else {
      UIHelper.createButton(this, GAME_WIDTH / 2, 685, '← Back', () => {
        UIHelper.goToScene(this, 'MenuScene');
      }, { width: 160, height: 40, fontSize: '13px', depth: 100 });
    }

    this.updateRoleVisibility();
  }

  createLabel(y, text) {
    return this.add.text(GAME_WIDTH / 2, y, text, {
      fontFamily: 'Orbitron', fontSize: '12px', color: COLORS.silver,
    }).setOrigin(0.5);
  }

  createRoleToggle(y) {
    const roles = [
      { id: ROLES.STUDENT, label: '🎓 Student' },
      { id: ROLES.LECTURER, label: '👨‍🏫 Lecturer' },
    ];

    roles.forEach((r, idx) => {
      const x = GAME_WIDTH / 2 + (idx === 0 ? -80 : 80);
      const isActive = this.role === r.id;

      const bg = this.add.rectangle(x, y, 150, 36, isActive ? 0xffffff : 0xffffff, isActive ? 0.22 : 0.08)
        .setStrokeStyle(1, 0xffffff, isActive ? 0.55 : 0.3)
        .setInteractive({ useHandCursor: true })
        .setDepth(10);

      const label = this.add.text(x, y, r.label, {
        fontFamily: 'Inter', fontSize: '12px',
        color: isActive ? COLORS.gold : COLORS.textMuted,
      }).setOrigin(0.5);

      bg.on('pointerup', () => {
        this.role = r.id;
        this.scene.restart({ changePlayer: this.changePlayer });
      });
    });
  }

  createCycleArrows(y, onLeft, onRight) {
    const left = this.add.text(GAME_WIDTH / 2 - 140, y, '◀', {
      fontSize: '14px', color: COLORS.silver,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).on('pointerup', onLeft);

    const right = this.add.text(GAME_WIDTH / 2 + 140, y, '▶', {
      fontSize: '14px', color: COLORS.silver,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).on('pointerup', onRight);

    return { left, right };
  }

  createAvatarSection(y) {
    this.add.text(GAME_WIDTH / 2, y, '📸 Play as Yourself', {
      fontFamily: 'Orbitron', fontSize: '12px', color: COLORS.silver,
    }).setOrigin(0.5);

    // Preview circle
    this.avatarPreview = this.add.circle(GAME_WIDTH / 2, y + 45, 30, 0x1e3a5f)
      .setStrokeStyle(2, 0xc0c0c0, 0.5);

    this.avatarImage = null;
    if (this.avatarData && this.textures.exists('player_avatar_preview')) {
      this.textures.remove('player_avatar_preview');
    }
    if (this.avatarData) {
      this.loadAvatarPreview(this.avatarData, y + 45);
    } else {
      this.add.text(GAME_WIDTH / 2, y + 45, '🙂', { fontSize: '28px' }).setOrigin(0.5);
    }

    const btnY = y + 95;
    const btns = [
      { label: this.avatarData ? '📷 Change Photo' : '📷 Take Photo', action: () => this.handleTakePhoto(y + 45) },
      { label: '📁 Upload', action: () => this.handleUpload(y + 45) },
    ];

    if (this.avatarData) {
      btns.push({ label: '🗑️ Remove Photo', action: () => this.handleRemoveAvatar(y + 45) });
    }

    const spacing = 100;
    const startX = GAME_WIDTH / 2 - ((btns.length - 1) * spacing) / 2;

    btns.forEach((btn, idx) => {
      const x = startX + idx * spacing;
      const bg = this.add.rectangle(x, btnY, 90, 32, 0xffffff, 0.12)
        .setStrokeStyle(1, 0xffffff, 0.4)
        .setInteractive({ useHandCursor: true })
        .setDepth(10);

      this.add.text(x, btnY, btn.label, {
        fontFamily: 'Inter', fontSize: '9px', color: COLORS.text,
      }).setOrigin(0.5);

      bg.on('pointerup', btn.action);
    });

    // Default avatar style picker (when no photo)
    if (!this.avatarData) {
      this.add.text(GAME_WIDTH / 2, y + 140, 'Or choose avatar style:', {
        fontFamily: 'Inter', fontSize: '10px', color: COLORS.textMuted,
      }).setOrigin(0.5);

      const styles = Object.values(AVATAR_STYLES);
      this.styleText = this.add.text(GAME_WIDTH / 2, y + 165,
        `${styles[this.avatarStyleIndex].emoji} ${styles[this.avatarStyleIndex].label}`, {
          fontFamily: 'Inter', fontSize: '14px', color: COLORS.text,
        }).setOrigin(0.5);

      this.createCycleArrows(y + 165,
        () => this.cycleAvatarStyle(-1),
        () => this.cycleAvatarStyle(1)
      );
    }
  }

  cycleAvatarStyle(dir = 1) {
    const styles = Object.values(AVATAR_STYLES);
    this.avatarStyleIndex = (this.avatarStyleIndex + dir + styles.length) % styles.length;
    this.styleText?.setText(`${styles[this.avatarStyleIndex].emoji} ${styles[this.avatarStyleIndex].label}`);
  }

  loadAvatarPreview(data, y) {
    if (this.avatarImage) this.avatarImage.destroy();
    const key = 'player_avatar_preview';
    if (this.textures.exists(key)) this.textures.remove(key);
    this.textures.addBase64(key, data);
    this.avatarImage = this.add.image(GAME_WIDTH / 2, y, key)
      .setDisplaySize(56, 56)
      .setDepth(1);
  }

  async handleTakePhoto(y) {
    const result = await openCameraCapture();
    if (result) {
      this.avatarData = result;
      this.loadAvatarPreview(result, y);
      this.cameras.main.flash(200, 192, 192, 192, false);
    }
  }

  async handleUpload(y) {
    const result = await openImageUpload();
    if (result) {
      this.avatarData = result;
      this.loadAvatarPreview(result, y);
    }
  }

  handleRemoveAvatar(y) {
    clearAvatar();
    this.avatarData = null;
    if (this.avatarImage) this.avatarImage.destroy();
    this.scene.restart({ changePlayer: this.changePlayer });
  }

  updateRoleVisibility() {
    const isStudent = this.role === ROLES.STUDENT;
    this.yearLabel?.setVisible(isStudent);
    this.yearText?.setVisible(isStudent);
    this.yearArrows?.left?.setVisible(isStudent);
    this.yearArrows?.right?.setVisible(isStudent);
  }

  createInputField(x, y, value, placeholder) {
    const canvas = this.game.canvas;
    const rect = canvas.getBoundingClientRect();
    const scaleX = rect.width / GAME_WIDTH;
    const scaleY = rect.height / GAME_HEIGHT;

    const input = document.createElement('input');
    input.type = 'text';
    input.value = value;
    input.placeholder = placeholder;
    input.maxLength = 30;
    input.style.cssText = `
      position: absolute;
      left: ${rect.left + (x - 140) * scaleX}px;
      top: ${rect.top + (y - 16) * scaleY}px;
      width: ${280 * scaleX}px;
      height: ${32 * scaleY}px;
      background: rgba(0, 0, 0, 0.45);
      border: 1px solid rgba(255, 255, 255, 0.45);
      border-radius: 8px;
      color: #e8e8e8;
      font-family: Inter, sans-serif;
      font-size: ${13 * scaleY}px;
      padding: 0 10px;
      outline: none;
      text-align: center;
      z-index: 10;
    `;
    document.body.appendChild(input);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.submitPlayer();
      }
    });
    this.events.on('shutdown', () => input.remove());
    this.events.on('destroy', () => input.remove());
    return input;
  }

  cycleDepartment(dir = 1) {
    this.deptIndex = (this.deptIndex + dir + DEPARTMENTS.length) % DEPARTMENTS.length;
    this.deptText.setText(DEPARTMENTS[this.deptIndex]);
  }

  cycleYear(dir = 1) {
    this.yearIndex = (this.yearIndex + dir + YEARS.length) % YEARS.length;
    this.yearText.setText(YEARS[this.yearIndex]);
  }

  submitPlayer() {
    const name = this.nameInput?.value?.trim();
    if (!name || name.length < 2) {
      this.errorText.setText('Please enter your name (at least 2 characters)');
      this.errorText.setVisible(true);
      return;
    }

    savePlayer({
      name,
      role: this.role,
      department: DEPARTMENTS[this.deptIndex],
      year: this.role === ROLES.STUDENT ? YEARS[this.yearIndex] : 'Lecturer',
      avatarStyle: Object.values(AVATAR_STYLES)[this.avatarStyleIndex]?.id || 'student',
    });

    UIHelper.goToScene(this, 'ModeScene');
  }
}
