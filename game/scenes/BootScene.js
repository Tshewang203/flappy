import { GAME_WIDTH, GAME_HEIGHT, COLORS, ASSETS } from '../config/constants.js';
import { loadOptionalImages } from '../utils/assets.js';
import { initQuizData } from '../utils/quizEngine.js';

/**
 * BootScene — Loads quiz JSON data, optional assets, and generates procedural textures.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    this.load.json('cst_history', 'data/cst_history.json');
    this.load.json('department_questions', 'data/department_questions.json');
    this.load.image('cst_logo', ASSETS.logo);
    this.load.on('loaderror', (file) => {
      if (file.key === 'cst_logo') console.warn('CST logo failed to load — using placeholder.');
    });

    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'Loading...', {
      fontFamily: 'Orbitron', fontSize: '18px', color: COLORS.silver,
    }).setOrigin(0.5).setName('boot_loading');
  }

  create() {
    this.children.getByName('boot_loading')?.destroy();

    const cstData = this.cache.json.get('cst_history');
    const deptData = this.cache.json.get('department_questions');
    if (cstData && deptData) {
      initQuizData(cstData, deptData);
    } else {
      console.warn('Quiz JSON failed to load — quiz modes may be unavailable.');
    }

    this.generateTextures();
    loadOptionalImages(this);
    document.getElementById('loading-screen')?.classList.add('hidden');
    this.scene.start('IntroScene');
  }

  /** Create all game textures procedurally */
  generateTextures() {
    this.createBirdTexture();
    this.createWingTexture();
    this.createObstacleTextures();
    this.createPowerUpTextures();
    this.createBackgroundTextures();
    this.createUITextures();
    this.createParticleTexture();
    this.createAvatarTextures();
  }

  createAvatarTextures() {
    const styles = [
      { key: 'avatar_lecturer', color: 0x0067b1 },
      { key: 'avatar_hacker', color: 0x2ecc71 },
    ];
    styles.forEach(({ key, color }) => {
      const g = this.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(color, 1);
      g.fillCircle(24, 24, 22);
      g.lineStyle(2, 0xffd700, 0.8);
      g.strokeCircle(24, 24, 22);

      // Simple person silhouette glyph
      g.fillStyle(0xffffff, 0.9);
      g.fillCircle(24, 17, 7);
      g.beginPath();
      g.arc(24, 40, 14, Phaser.Math.DegToRad(180), Phaser.Math.DegToRad(360), true);
      g.closePath();
      g.fillPath();

      g.generateTexture(key, 48, 48);
      g.destroy();
    });
  }

  createWingTexture() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0xe6c200, 1);
    g.fillEllipse(22, 11, 42, 20);
    g.fillStyle(0xffd700, 0.6);
    g.fillEllipse(12, 11, 22, 11);
    g.lineStyle(1, 0xffffff, 0.25);
    g.strokeEllipse(22, 11, 42, 20);
    g.generateTexture('wing', 44, 22);
    g.destroy();
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
      book: { color: 0x8b4513, label: 'BOOK' },
      exam: { color: 0xe74c3c, label: 'EXAM' },
      assignment: { color: 0xf39c12, label: 'TASK' },
      bug: { color: 0x2ecc71, label: 'BUG' },
      error: { color: 0xe74c3c, label: 'ERR' },
      deadline: { color: 0x9b59b6, label: 'DUE' },
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

    // Pipe-style obstacles (top/bottom pairs) — CST campus column palette
    this.createPipeTexture('pipe_silver', 0xd4d4d4, 0x7a7a7a, 0xc0c0c0);
    this.createPipeTexture('pipe_blue', 0x0094db, 0x004f8a, 0x0067b1);
    this.createPipeTexture('pipe_purple', 0x9b59b6, 0x5b2c6f, 0xc39bd3);
    this.createPipeTexture('pipe_red', 0xe74c3c, 0x922b21, 0xf1948a);
    this.createPipeCapTexture();
  }

  createPipeTexture(key, mainColor, darkColor, accentColor) {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    const w = 88;
    const h = 400;
    const capH = 36;

    // Main column body — vertical gradient bands
    for (let y = capH; y < h; y += 1) {
      const t = (y - capH) / (h - capH);
      const r = Phaser.Display.Color.Interpolate.ColorWithColor(
        Phaser.Display.Color.ValueToColor(mainColor),
        Phaser.Display.Color.ValueToColor(darkColor),
        100,
        Math.floor(t * 40)
      );
      g.fillStyle(Phaser.Display.Color.GetColor(r.r, r.g, r.b), 1);
      g.fillRect(6, y, w - 12, 1);
    }

    // Left highlight (3D depth)
    g.fillStyle(0xffffff, 0.18);
    g.fillRect(8, capH, 8, h - capH);
    // Right shadow
    g.fillStyle(0x000000, 0.22);
    g.fillRect(w - 16, capH, 8, h - capH);

    // Horizontal brick / book bands
    for (let y = capH + 18; y < h; y += 28) {
      g.lineStyle(1, 0x000000, 0.12);
      g.lineBetween(6, y, w - 6, y);
      g.fillStyle(accentColor, 0.08);
      g.fillRect(6, y, w - 12, 3);
    }

    // Outer edge bevel
    g.lineStyle(2, accentColor, 0.45);
    g.strokeRect(5, capH, w - 10, h - capH - 2);
    g.lineStyle(1, 0xffffff, 0.15);
    g.lineBetween(7, capH, 7, h - 4);

    // Decorative cap at gap end (top of texture)
    g.fillStyle(darkColor, 1);
    g.fillRoundedRect(0, 0, w, capH, 6);
    g.fillStyle(mainColor, 1);
    g.fillRoundedRect(3, 4, w - 6, capH - 8, 4);
    g.fillStyle(accentColor, 0.85);
    g.fillRect(3, capH - 10, w - 6, 6);
    g.lineStyle(2, 0xffffff, 0.25);
    g.lineBetween(6, 8, w - 6, 8);

    g.generateTexture(key, w, h);
    g.destroy();
  }

  createPipeCapTexture() {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    const w = 96;
    const h = 34;

    g.fillStyle(0x004f8a, 1);
    g.fillRoundedRect(0, 0, w, h, 8);
    g.fillStyle(0x0067b1, 1);
    g.fillRoundedRect(3, 3, w - 6, h - 8, 6);
    g.fillStyle(0xc0c0c0, 0.9);
    g.fillRect(3, h - 10, w - 6, 5);
    g.fillStyle(0xffd700, 0.55);
    g.fillRect(8, 6, w - 16, 4);
    g.lineStyle(2, 0xffffff, 0.2);
    g.strokeRoundedRect(3, 3, w - 6, h - 8, 6);

    g.generateTexture('pipe_cap', w, h);
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

    // Ground — tiled grass blocks
    const groundH = 60;
    const blockW = 40;
    const ground = this.make.graphics({ x: 0, y: 0, add: false });

    for (let x = 0; x < GAME_WIDTH; x += blockW) {
      const alt = (x / blockW) % 2 === 0;
      const grassTop = alt ? 0x5cb85c : 0x4caf50;
      const grassDark = alt ? 0x449d44 : 0x3d8b3d;
      const dirt = alt ? 0x8b6914 : 0x7a5c12;

      ground.fillStyle(dirt, 1);
      ground.fillRect(x, 18, blockW, groundH - 18);

      ground.fillStyle(grassTop, 1);
      ground.fillRect(x, 0, blockW, 20);
      ground.fillStyle(grassDark, 0.5);
      ground.fillRect(x, 14, blockW, 6);

      ground.fillStyle(0x7dce7d, 0.55);
      ground.fillRect(x + 3, 0, blockW - 6, 4);

      for (let i = 0; i < 2; i++) {
        const bx = x + 8 + i * 18;
        ground.fillStyle(0x2e7d32, 0.7);
        ground.fillTriangle(bx, 0, bx + 3, 0, bx + 1, 7);
        ground.fillTriangle(bx + 8, 0, bx + 11, 0, bx + 9, 6);
      }

      for (let i = 0; i < 3; i++) {
        ground.fillStyle(0x000000, 0.07);
        ground.fillRect(x + 6 + i * 11, 26 + (i % 2) * 10, 5, 3);
      }

      ground.lineStyle(1, 0x000000, 0.12);
      ground.lineBetween(x, 0, x, groundH);
      ground.lineStyle(1, 0x2e5e2e, 0.35);
      ground.lineBetween(x, 18, x + blockW, 18);
    }

    ground.fillStyle(0x8fd48f, 0.4);
    ground.fillRect(0, 0, GAME_WIDTH, 2);
    ground.generateTexture('ground', GAME_WIDTH, groundH);
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

    // Button background — CST blue glass
    const btn = this.make.graphics({ x: 0, y: 0, add: false });
    btn.fillStyle(0x0067b1, 0.55);
    btn.fillRoundedRect(0, 0, 220, 52, 26);
    btn.lineStyle(2, 0x0094db, 0.85);
    btn.strokeRoundedRect(0, 0, 220, 52, 26);
    btn.generateTexture('btn_bg', 220, 52);
    btn.destroy();

    // Card background
    const card = this.make.graphics({ x: 0, y: 0, add: false });
    card.fillStyle(0x0067b1, 0.5);
    card.fillRoundedRect(0, 0, 400, 120, 16);
    card.lineStyle(2, 0x0094db, 0.5);
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
