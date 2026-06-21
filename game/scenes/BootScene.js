import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../config/constants.js';

/**
 * BootScene — Generates all procedural textures and loads assets.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    // Progress bar
    const barW = GAME_WIDTH * 0.6;
    const barH = 20;
    const barX = (GAME_WIDTH - barW) / 2;
    const barY = GAME_HEIGHT / 2;

    const progressBg = this.add.graphics();
    progressBg.fillStyle(0x1e3a5f, 1);
    progressBg.fillRoundedRect(barX, barY, barW, barH, 10);

    const progressBar = this.add.graphics();
    const loadingText = this.add
      .text(GAME_WIDTH / 2, barY - 40, 'Loading...', {
        fontFamily: 'Orbitron',
        fontSize: '18px',
        color: COLORS.silver,
      })
      .setOrigin(0.5);

    this.load.on('progress', (value) => {
      progressBar.clear();
      progressBar.fillStyle(0xc0c0c0, 1);
      progressBar.fillRoundedRect(barX + 2, barY + 2, (barW - 4) * value, barH - 4, 8);
    });

    this.load.on('complete', () => {
      progressBg.destroy();
      progressBar.destroy();
      loadingText.destroy();
    });
  }

  create() {
    this.generateTextures();
    this.scene.start('MenuScene');
  }

  /** Create all game textures procedurally */
  generateTextures() {
    this.createBirdTexture();
    this.createObstacleTextures();
    this.createPowerUpTextures();
    this.createBackgroundTextures();
    this.createUITextures();
    this.createParticleTexture();
  }

  createBirdTexture() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    const w = 48;
    const h = 36;

    // Body
    g.fillStyle(0xffd700, 1);
    g.fillEllipse(w / 2, h / 2, w - 8, h - 6);

    // Wing
    g.fillStyle(0xe6c200, 1);
    g.fillEllipse(w / 2 - 4, h / 2 + 2, 18, 12);

    // Eye
    g.fillStyle(0xffffff, 1);
    g.fillCircle(w / 2 + 8, h / 2 - 4, 7);
    g.fillStyle(0x1e3a5f, 1);
    g.fillCircle(w / 2 + 10, h / 2 - 4, 3);

    // Beak
    g.fillStyle(0xff6b35, 1);
    g.fillTriangle(w - 6, h / 2, w + 4, h / 2 - 3, w + 4, h / 2 + 3);

    // Graduation cap
    g.fillStyle(0x1e3a5f, 1);
    g.fillRect(w / 2 - 12, 2, 24, 4);
    g.fillRect(w / 2 - 6, 0, 12, 6);

    g.generateTexture('bird', w + 4, h);
    g.destroy();
  }

  createObstacleTextures() {
    const types = {
      book: { color: 0x8b4513, emoji: '📚', label: 'BOOK' },
      exam: { color: 0xe74c3c, emoji: '📝', label: 'EXAM' },
      assignment: { color: 0xf39c12, emoji: '📋', label: 'TASK' },
      bug: { color: 0x2ecc71, emoji: '🐛', label: 'BUG' },
      error: { color: 0xe74c3c, emoji: '⚠️', label: 'ERR' },
      deadline: { color: 0x9b59b6, emoji: '⏰', label: 'DUE' },
    };

    Object.entries(types).forEach(([key, cfg]) => {
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      const w = 70;
      const h = 50;

      g.fillStyle(cfg.color, 0.9);
      g.fillRoundedRect(0, 0, w, h, 8);
      g.lineStyle(2, 0xc0c0c0, 0.6);
      g.strokeRoundedRect(0, 0, w, h, 8);

      g.generateTexture(`obstacle_${key}`, w, h);
      g.destroy();
    });

    // Pipe-style obstacles (top/bottom pairs)
    this.createPipeTexture('pipe_silver', 0xc0c0c0, 0x8a8a8a);
    this.createPipeTexture('pipe_blue', 0x2d5a8e, 0x1e3a5f);
    this.createPipeTexture('pipe_purple', 0x6c3483, 0x4a235a);
    this.createPipeTexture('pipe_red', 0xc0392b, 0x922b21);
  }

  createPipeTexture(key, mainColor, darkColor) {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    const w = 80;
    const h = 400;

    g.fillStyle(mainColor, 1);
    g.fillRect(4, 0, w - 8, h);
    g.fillStyle(darkColor, 1);
    g.fillRect(0, 0, w, 30);
    g.lineStyle(2, 0xffffff, 0.2);
    g.strokeRect(4, 0, w - 8, h);

    g.generateTexture(key, w, h);
    g.destroy();
  }

  createPowerUpTextures() {
    const types = {
      coffee: { color: 0x6f4e37, glow: 0xffd700 },
      shield: { color: 0x3498db, glow: 0x5dade2 },
      double: { color: 0xf1c40f, glow: 0xffd700 },
      wifi: { color: 0x2ecc71, glow: 0x58d68d },
    };

    Object.entries(types).forEach(([key, cfg]) => {
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      const size = 40;

      g.fillStyle(cfg.glow, 0.3);
      g.fillCircle(size / 2, size / 2, size / 2);

      g.fillStyle(cfg.color, 1);
      g.fillCircle(size / 2, size / 2, size / 2 - 6);
      g.lineStyle(2, cfg.glow, 0.8);
      g.strokeCircle(size / 2, size / 2, size / 2 - 6);

      g.generateTexture(`powerup_${key}`, size, size);
      g.destroy();
    });
  }

  createBackgroundTextures() {
    const eras = [
      { key: 'bg_foundation', top: 0x1a1a2e, bottom: 0x16213e },
      { key: 'bg_growth', top: 0x16213e, bottom: 0x0f3460 },
      { key: 'bg_expansion', top: 0x0f3460, bottom: 0x1a1a40 },
      { key: 'bg_innovation', top: 0x1a1a40, bottom: 0x2d1b69 },
      { key: 'bg_jubilee', top: 0x2d1b69, bottom: 0x1e3a5f },
    ];

    eras.forEach(({ key, top, bottom }) => {
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      g.fillGradientStyle(top, top, bottom, bottom, 1);
      g.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

      // Stars
      for (let i = 0; i < 30; i++) {
        const alpha = 0.2 + Math.random() * 0.5;
        g.fillStyle(0xffffff, alpha);
        g.fillCircle(
          Math.random() * GAME_WIDTH,
          Math.random() * GAME_HEIGHT * 0.7,
          1 + Math.random() * 2
        );
      }

      g.generateTexture(key, GAME_WIDTH, GAME_HEIGHT);
      g.destroy();
    });

    // Ground
    const ground = this.make.graphics({ x: 0, y: 0, add: false });
    ground.fillStyle(0x1e3a5f, 1);
    ground.fillRect(0, 0, GAME_WIDTH, 60);
    ground.fillStyle(0xc0c0c0, 0.3);
    ground.fillRect(0, 0, GAME_WIDTH, 4);
    ground.generateTexture('ground', GAME_WIDTH, 60);
    ground.destroy();
  }

  createUITextures() {
    // Logo placeholder
    const logo = this.make.graphics({ x: 0, y: 0, add: false });
    logo.fillStyle(0xc0c0c0, 0.15);
    logo.fillCircle(60, 60, 58);
    logo.lineStyle(3, 0xc0c0c0, 0.8);
    logo.strokeCircle(60, 60, 55);
    logo.lineStyle(2, 0xffd700, 0.6);
    logo.strokeCircle(60, 60, 45);
    logo.generateTexture('logo', 120, 120);
    logo.destroy();

    // Button background
    const btn = this.make.graphics({ x: 0, y: 0, add: false });
    btn.fillStyle(0x1e3a5f, 0.9);
    btn.fillRoundedRect(0, 0, 220, 52, 26);
    btn.lineStyle(2, 0xc0c0c0, 0.6);
    btn.strokeRoundedRect(0, 0, 220, 52, 26);
    btn.generateTexture('btn_bg', 220, 52);
    btn.destroy();

    // Card background
    const card = this.make.graphics({ x: 0, y: 0, add: false });
    card.fillStyle(0x1e3a5f, 0.85);
    card.fillRoundedRect(0, 0, 400, 120, 16);
    card.lineStyle(2, 0xc0c0c0, 0.4);
    card.strokeRoundedRect(0, 0, 400, 120, 16);
    card.generateTexture('card_bg', 400, 120);
    card.destroy();

    // Shield effect
    const shield = this.make.graphics({ x: 0, y: 0, add: false });
    shield.lineStyle(3, 0x3498db, 0.6);
    shield.strokeCircle(30, 30, 28);
    shield.fillStyle(0x3498db, 0.15);
    shield.fillCircle(30, 30, 28);
    shield.generateTexture('shield_fx', 60, 60);
    shield.destroy();
  }

  createParticleTexture() {
    const p = this.make.graphics({ x: 0, y: 0, add: false });
    p.fillStyle(0xffd700, 1);
    p.fillCircle(4, 4, 4);
    p.generateTexture('particle', 8, 8);
    p.destroy();
  }
}
