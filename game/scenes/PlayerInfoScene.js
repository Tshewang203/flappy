import { GAME_WIDTH, GAME_HEIGHT, DEPARTMENTS, YEARS, COLORS } from '../config/constants.js';
import { getPlayer, savePlayer, clearPlayer } from '../utils/storage.js';
import { UIHelper } from '../utils/UIHelper.js';

/**
 * PlayerInfoScene — Collects name, department, and year (login-free).
 */
export class PlayerInfoScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PlayerInfoScene' });
  }

  init(data) {
    this.changePlayer = data?.changePlayer || false;
  }

  create() {
    UIHelper.fadeIn(this);
    UIHelper.createBackgroundParticles(this, 12);

    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x0f1f33, 0.6);

    UIHelper.createTitle(this, 80, 'Player Info', 'Tell us about yourself');

    const existing = getPlayer();
    const startY = 160;
    const fieldGap = 90;

    // ── Name field ──
    this.add
      .text(GAME_WIDTH / 2, startY, 'Name', {
        fontFamily: 'Orbitron',
        fontSize: '13px',
        color: COLORS.silver,
      })
      .setOrigin(0.5);

    const nameInput = this.createInputField(
      GAME_WIDTH / 2,
      startY + 35,
      existing?.name || '',
      'Enter your name'
    );
    this.nameInput = nameInput;

    // ── Department dropdown ──
    this.add
      .text(GAME_WIDTH / 2, startY + fieldGap, 'Department', {
        fontFamily: 'Orbitron',
        fontSize: '13px',
        color: COLORS.silver,
      })
      .setOrigin(0.5);

    this.deptIndex = existing
      ? Math.max(0, DEPARTMENTS.indexOf(existing.department))
      : 0;

    this.deptText = this.add
      .text(GAME_WIDTH / 2, startY + fieldGap + 35, DEPARTMENTS[this.deptIndex], {
        fontFamily: 'Inter',
        fontSize: '14px',
        color: COLORS.text,
        wordWrap: { width: 280 },
        align: 'center',
      })
      .setOrigin(0.5);

    const deptBg = this.add
      .rectangle(GAME_WIDTH / 2, startY + fieldGap + 35, 300, 44, 0x1e3a5f, 0.9)
      .setStrokeStyle(1, 0xc0c0c0, 0.4)
      .setInteractive({ useHandCursor: true });

    this.deptText.setDepth(1);
    deptBg.on('pointerdown', () => this.cycleDepartment());

    // Arrow indicators
    this.add
      .text(GAME_WIDTH / 2 - 140, startY + fieldGap + 35, '◀', {
        fontSize: '14px',
        color: COLORS.silver,
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.cycleDepartment(-1));

    this.add
      .text(GAME_WIDTH / 2 + 140, startY + fieldGap + 35, '▶', {
        fontSize: '14px',
        color: COLORS.silver,
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.cycleDepartment(1));

    // ── Year dropdown ──
    this.add
      .text(GAME_WIDTH / 2, startY + fieldGap * 2, 'Year', {
        fontFamily: 'Orbitron',
        fontSize: '13px',
        color: COLORS.silver,
      })
      .setOrigin(0.5);

    this.yearIndex = existing ? Math.max(0, YEARS.indexOf(existing.year)) : 0;

    this.yearText = this.add
      .text(GAME_WIDTH / 2, startY + fieldGap * 2 + 35, YEARS[this.yearIndex], {
        fontFamily: 'Inter',
        fontSize: '16px',
        color: COLORS.text,
      })
      .setOrigin(0.5);

    const yearBg = this.add
      .rectangle(GAME_WIDTH / 2, startY + fieldGap * 2 + 35, 300, 44, 0x1e3a5f, 0.9)
      .setStrokeStyle(1, 0xc0c0c0, 0.4)
      .setInteractive({ useHandCursor: true });

    this.yearText.setDepth(1);
    yearBg.on('pointerdown', () => this.cycleYear());

    this.add
      .text(GAME_WIDTH / 2 - 140, startY + fieldGap * 2 + 35, '◀', {
        fontSize: '14px',
        color: COLORS.silver,
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.cycleYear(-1));

    this.add
      .text(GAME_WIDTH / 2 + 140, startY + fieldGap * 2 + 35, '▶', {
        fontSize: '14px',
        color: COLORS.silver,
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.cycleYear(1));

    // Error message
    this.errorText = this.add
      .text(GAME_WIDTH / 2, startY + fieldGap * 3 + 10, '', {
        fontFamily: 'Inter',
        fontSize: '13px',
        color: '#e74c3c',
      })
      .setOrigin(0.5)
      .setVisible(false);

    // Continue button
    UIHelper.createButton(this, GAME_WIDTH / 2, 580, 'CONTINUE', () => {
      this.submitPlayer();
    });

    // Back / clear
    if (this.changePlayer) {
      UIHelper.createButton(
        this,
        GAME_WIDTH / 2,
        650,
        'Clear & Go Back',
        () => {
          clearPlayer();
          UIHelper.fadeToScene(this, 'MenuScene');
        },
        { width: 200, height: 40, fontSize: '13px' }
      );
    } else {
      UIHelper.createButton(
        this,
        GAME_WIDTH / 2,
        650,
        '← Back',
        () => UIHelper.fadeToScene(this, 'MenuScene'),
        { width: 160, height: 40, fontSize: '13px' }
      );
    }
  }

  /** Create an HTML input overlaid on the canvas for text entry */
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
      left: ${rect.left + (x - 150) * scaleX}px;
      top: ${rect.top + (y - 18) * scaleY}px;
      width: ${300 * scaleX}px;
      height: ${36 * scaleY}px;
      background: rgba(30, 58, 95, 0.95);
      border: 1px solid rgba(192, 192, 192, 0.4);
      border-radius: 8px;
      color: #e8e8e8;
      font-family: Inter, sans-serif;
      font-size: ${14 * scaleY}px;
      padding: 0 12px;
      outline: none;
      text-align: center;
      z-index: 10;
    `;

    document.body.appendChild(input);

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
      department: DEPARTMENTS[this.deptIndex],
      year: YEARS[this.yearIndex],
    });

    UIHelper.fadeToScene(this, 'ModeScene');
  }
}
