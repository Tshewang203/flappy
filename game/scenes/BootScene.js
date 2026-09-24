import { GAME_WIDTH, GAME_HEIGHT, COLORS, ASSETS, WALL_PALETTES, POWER_UP_VISUALS } from '../config/constants.js';

/** Wing texture size and shoulder pivot (as a fraction of the texture) — shared with GameScene */
export const WING_TEX_W = 100;
export const WING_TEX_H = 80;
export const WING_ROOT = { x: 0.92, y: 0.42 };
/** Native width of the wall body texture (walls are tiled/scaled from it) */
export const WALL_TEX_W = 88;
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
  }

  createCanvasTexture(key, w, h, draw) {
    if (this.textures.exists(key)) this.textures.remove(key);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    draw(canvas.getContext('2d'), w, h);
    this.textures.addCanvas(key, canvas);
  }

  /**
   * Feathered wings. Each texture's root (pivot) sits at WING_ROOT (fraction of the texture)
   * so GameScene can rotate them around the shoulder.
   */
  createWingTexture() {
    const palettes = {
      wing: { root: '#ffffff', tip: '#eaf4ff', edge: '#9db4cc', covert: '#ffffff', shine: '#ffffff' },
      wing_bird: { root: '#ffffff', tip: '#fff4c8', edge: '#b89a52', covert: '#ffffff', shine: '#ffffff' },
    };
    Object.entries(palettes).forEach(([key, pal]) => {
      this.createCanvasTexture(`${key}_left`, WING_TEX_W, WING_TEX_H, (ctx) => this.drawWing(ctx, pal, false));
      this.createCanvasTexture(`${key}_right`, WING_TEX_W, WING_TEX_H, (ctx) => this.drawWing(ctx, pal, true));
    });
  }

  drawWing(ctx, pal, mirror) {
    const w = WING_TEX_W;
    const h = WING_TEX_H;
    if (mirror) {
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
    }
    const rx = w * WING_ROOT.x;
    const ry = h * WING_ROOT.y;
    ctx.lineJoin = 'round';

    // Primary feathers fan out from the shoulder, drawn bottom-up so upper ones overlap
    const count = 7;
    for (let i = count - 1; i >= 0; i--) {
      const ang = Math.PI + 0.36 - i * 0.16;
      const len = (w - 14) * (1 - i * 0.1);
      const thick = h * 0.1;
      ctx.save();
      ctx.translate(rx + Math.cos(ang) * len * 0.5, ry + Math.sin(ang) * len * 0.5);
      ctx.rotate(ang);
      const grad = ctx.createLinearGradient(-len / 2, 0, len / 2, 0);
      grad.addColorStop(0, pal.root);
      grad.addColorStop(0.55, pal.tip);
      grad.addColorStop(1, pal.tip);
      ctx.fillStyle = grad;
      ctx.strokeStyle = pal.edge;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      // Pointed feather: rounded at the base, tapered at the tip
      ctx.moveTo(-len / 2, 0);
      ctx.quadraticCurveTo(-len / 2 + 4, -thick, 0, -thick);
      ctx.quadraticCurveTo(len / 2 - 6, -thick * 0.8, len / 2, 0);
      ctx.quadraticCurveTo(len / 2 - 6, thick * 0.8, 0, thick);
      ctx.quadraticCurveTo(-len / 2 + 4, thick, -len / 2, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // Rachis (quill line) — faint so the wing stays soft and white
      ctx.strokeStyle = 'rgba(157,180,204,0.45)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-len / 2 + 6, 0);
      ctx.lineTo(len / 2 - 8, 0);
      ctx.stroke();
      ctx.restore();
    }

    // Coverts — soft rounded layer over the shoulder
    ctx.fillStyle = pal.covert;
    ctx.strokeStyle = pal.edge;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(rx - w * 0.2, ry + 2, w * 0.24, h * 0.22, -0.12, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = pal.shine;
    ctx.globalAlpha = 0.8;
    ctx.beginPath();
    ctx.ellipse(rx - w * 0.22, ry - 3, w * 0.13, h * 0.07, -0.12, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  /** Classic Flappy-style bird (wing is a separate animated sprite). */
  createBirdTexture() {
    this.createCanvasTexture('bird', 68, 52, (ctx) => {
      ctx.lineJoin = 'round';
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#3a2a10';

      // Tail
      ctx.fillStyle = '#f5b400';
      ctx.beginPath();
      ctx.moveTo(10, 24);
      ctx.lineTo(2, 16);
      ctx.lineTo(4, 30);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Body
      const body = ctx.createRadialGradient(28, 20, 4, 32, 27, 26);
      body.addColorStop(0, '#fff27a');
      body.addColorStop(0.6, '#ffd21f');
      body.addColorStop(1, '#f0a500');
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.ellipse(32, 27, 24, 20, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Belly
      ctx.fillStyle = '#fff6c4';
      ctx.beginPath();
      ctx.ellipse(30, 37, 14, 7, 0, 0, Math.PI * 2);
      ctx.fill();

      // Eye
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(44, 18, 9, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#1b1b1b';
      ctx.beginPath();
      ctx.ellipse(47, 19, 3.5, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(48, 16, 1.5, 0, Math.PI * 2);
      ctx.fill();

      // Beak (two lips)
      ctx.fillStyle = '#ff7a2f';
      ctx.beginPath();
      ctx.moveTo(44, 29);
      ctx.quadraticCurveTo(66, 26, 64, 32);
      ctx.lineTo(44, 33);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#e8561a';
      ctx.beginPath();
      ctx.moveTo(44, 33);
      ctx.lineTo(62, 33);
      ctx.quadraticCurveTo(60, 39, 44, 37);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    });
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

    // Flappy-style walls — one body + cap texture per level palette
    WALL_PALETTES.forEach((pal, i) => {
      this.createCanvasTexture(`wall_body_${i}`, WALL_TEX_W, 16, (ctx, w, h) => {
        ctx.fillStyle = this.wallGradient(ctx, 0, w, pal);
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = pal.outline;
        ctx.fillRect(0, 0, 3, h);
        ctx.fillRect(w - 3, 0, 3, h);
      });

      this.createCanvasTexture(`wall_cap_${i}`, WALL_TEX_W + 12, 40, (ctx, w, h) => {
        ctx.fillStyle = pal.outline;
        ctx.beginPath();
        ctx.roundRect(0, 0, w, h, 5);
        ctx.fill();
        ctx.fillStyle = this.wallGradient(ctx, 3, w - 3, pal);
        ctx.beginPath();
        ctx.roundRect(3, 3, w - 6, h - 6, 3);
        ctx.fill();
        // Top rim highlight and inner shadow where the lip meets the body
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.fillRect(5, 5, w - 10, 3);
        ctx.fillStyle = 'rgba(0,0,0,0.22)';
        ctx.fillRect(3, h - 9, w - 6, 6);
      });
    });
  }

  /** Horizontal cylinder shading: dark edges, bright highlight left of centre. */
  wallGradient(ctx, x0, x1, pal) {
    const grad = ctx.createLinearGradient(x0, 0, x1, 0);
    grad.addColorStop(0, pal.dark);
    grad.addColorStop(0.08, pal.mid);
    grad.addColorStop(0.24, pal.light);
    grad.addColorStop(0.34, pal.light);
    grad.addColorStop(0.5, pal.mid);
    grad.addColorStop(0.82, pal.mid);
    grad.addColorStop(0.94, pal.dark);
    grad.addColorStop(1, pal.dark);
    return grad;
  }

  createPowerUpTextures() {
    this.createCollectibleTextures();
  }

  /**
   * Power-up collectibles, drawn on canvas in the game's outlined/gradient style.
   * Each one is layered so parts can animate independently (see GameScene.spawnPowerUp):
   *   pu_aura (tinted glow) → pu_badge_<visual> (glossy coin) → pu_icon_<visual> → pu_gloss
   * All drawn at 128px for crisp edges and displayed at ~60px. Visuals: rabbit, snail, star,
   * shield (+ wifi for Department's WiFi Boost), colours in POWER_UP_VISUALS.
   */
  createCollectibleTextures() {
    const S = 128;
    const C = 64;
    const INK = '#1b2233';
    const ellipse = (ctx, x, y, rx, ry, rot, fill, stroke, lw = 5) => {
      ctx.beginPath();
      ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
      if (fill) { ctx.fillStyle = fill; ctx.fill(); }
      if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
    };
    const starPath = (ctx, cx, cy, outer, inner, points = 5) => {
      ctx.beginPath();
      for (let i = 0; i < points * 2; i++) {
        const r = i % 2 === 0 ? outer : inner;
        const a = (Math.PI / points) * i - Math.PI / 2;
        const x = cx + Math.cos(a) * r;
        const y = cy + Math.sin(a) * r;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath();
    };

    // ── Coin badges: dark outline, two-tone rim, domed centre ──
    Object.entries(POWER_UP_VISUALS).forEach(([visual, v]) => {
      this.createCanvasTexture(`pu_badge_${visual}`, S, S, (ctx) => {
        ellipse(ctx, C, C + 5, 56, 55, 0, 'rgba(0,0,0,0.28)');           // drop shadow
        ellipse(ctx, C, C, 56, 56, 0, INK);                               // outline
        const rim = ctx.createLinearGradient(0, 10, 0, 118);
        rim.addColorStop(0, v.rim[0]);
        rim.addColorStop(1, v.rim[1]);
        ellipse(ctx, C, C, 52, 52, 0, rim);
        const disc = ctx.createRadialGradient(C - 14, C - 18, 6, C, C, 44);
        disc.addColorStop(0, v.disc[0]);
        disc.addColorStop(1, v.disc[1]);
        ellipse(ctx, C, C, 43, 43, 0, disc, 'rgba(0,0,0,0.28)', 3);
      });
    });

    // Shared gloss highlight laid over every coin (stays still while the icon moves)
    this.createCanvasTexture('pu_gloss', S, S, (ctx) => {
      ctx.save();
      ctx.beginPath();
      ctx.arc(C, C, 52, 0, Math.PI * 2);
      ctx.clip();
      const g = ctx.createLinearGradient(0, 12, 0, 70);
      g.addColorStop(0, 'rgba(255,255,255,0.55)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ellipse(ctx, C - 10, C - 30, 40, 22, -0.25, g);
      ctx.restore();
      ellipse(ctx, C - 30, C - 26, 5, 3, -0.7, 'rgba(255,255,255,0.9)');
    });

    // Soft glow behind the coin (tinted per power-up at runtime)
    this.createCanvasTexture('pu_aura', S, S, (ctx) => {
      const g = ctx.createRadialGradient(C, C, 30, C, C, 64);
      g.addColorStop(0, 'rgba(255,255,255,0.9)');
      g.addColorStop(0.55, 'rgba(255,255,255,0.35)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, S, S);
    });

    // Four-point twinkle used around the star and in pickup bursts
    this.createCanvasTexture('pu_sparkle', 32, 32, (ctx) => {
      const g = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
      g.addColorStop(0, 'rgba(255,255,255,1)');
      g.addColorStop(0.4, 'rgba(255,255,255,0.35)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 32, 32);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(16, 0); ctx.quadraticCurveTo(18, 14, 32, 16); ctx.quadraticCurveTo(18, 18, 16, 32);
      ctx.quadraticCurveTo(14, 18, 0, 16); ctx.quadraticCurveTo(14, 14, 16, 0);
      ctx.fill();
    });

    // ── Rabbit: mid-sprint, ears streaming back, legs stretched ──
    this.createCanvasTexture('pu_icon_rabbit', S, S, (ctx) => {
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      const fur = ctx.createLinearGradient(40, 40, 80, 100);
      fur.addColorStop(0, '#ffffff');
      fur.addColorStop(1, '#dde2ee');
      ellipse(ctx, 70, 30, 7, 20, -0.75, '#e6e9f2', INK);                 // back ear
      ellipse(ctx, 34, 90, 17, 6.5, 0.35, '#eef0f7', INK);                // back leg kicking
      ellipse(ctx, 30, 64, 9, 9, 0, '#ffffff', INK);                      // tail puff
      ellipse(ctx, 58, 72, 27, 18, -0.28, fur, INK);                      // body
      ellipse(ctx, 50, 80, 12, 6, -0.3, 'rgba(0,0,0,0.07)');              // belly shade
      ellipse(ctx, 86, 54, 16, 14.5, 0.05, '#ffffff', INK);               // head
      ellipse(ctx, 86, 27, 7.5, 21, -0.45, '#ffffff', INK);               // front ear
      ellipse(ctx, 87, 29, 3.2, 14, -0.45, '#ffb3c7');                    // inner ear
      ellipse(ctx, 86, 88, 12, 5.5, -0.45, '#ffffff', INK);               // front leg reaching
      ellipse(ctx, 92, 51, 3.4, 4.2, 0, INK);                             // eye
      ellipse(ctx, 93.2, 49.5, 1.3, 1.3, 0, '#ffffff');                   // eye shine
      ellipse(ctx, 101.5, 57, 3, 2.4, 0, '#ff7aa2', INK, 2);              // nose
      ellipse(ctx, 86, 61, 4.5, 2.6, 0, 'rgba(255,130,165,0.55)');        // cheek
    });

    // ── Snail: big spiral shell, eye stalks, content smile ──
    this.createCanvasTexture('pu_icon_snail', S, S, (ctx) => {
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 9;
      ctx.beginPath(); ctx.moveTo(93, 70); ctx.lineTo(88, 38); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(101, 70); ctx.lineTo(108, 40); ctx.stroke();
      ctx.strokeStyle = '#a6db5a';
      ctx.lineWidth = 4.5;
      ctx.beginPath(); ctx.moveTo(93, 70); ctx.lineTo(88, 38); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(101, 70); ctx.lineTo(108, 40); ctx.stroke();
      ellipse(ctx, 88, 36, 6, 6, 0, '#ffffff', INK, 3.5);
      ellipse(ctx, 108, 38, 6, 6, 0, '#ffffff', INK, 3.5);
      ellipse(ctx, 89.5, 37, 2.6, 2.6, 0, INK);
      ellipse(ctx, 109.5, 39, 2.6, 2.6, 0, INK);
      // foot + head
      const skin = ctx.createLinearGradient(0, 68, 0, 104);
      skin.addColorStop(0, '#d4f59a');
      skin.addColorStop(1, '#8cc443');
      ctx.fillStyle = skin;
      ctx.strokeStyle = INK;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(14, 100);
      ctx.quadraticCurveTo(14, 88, 30, 88);
      ctx.lineTo(84, 88);
      ctx.quadraticCurveTo(86, 64, 98, 64);
      ctx.quadraticCurveTo(114, 64, 114, 84);
      ctx.quadraticCurveTo(114, 102, 98, 102);
      ctx.lineTo(20, 102);
      ctx.quadraticCurveTo(14, 102, 14, 100);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(103, 82, 6, 0.25, Math.PI - 0.7); ctx.stroke();       // smile
      ellipse(ctx, 110, 88, 3.5, 2, 0, 'rgba(255,130,165,0.5)');                    // cheek
      // shell
      const shell = ctx.createRadialGradient(48, 52, 4, 55, 62, 32);
      shell.addColorStop(0, '#ffe0a8');
      shell.addColorStop(0.55, '#f5a445');
      shell.addColorStop(1, '#c0621a');
      ellipse(ctx, 55, 62, 30, 29, 0, shell, INK);
      ctx.strokeStyle = '#7a3a0c';
      ctx.lineWidth = 4;
      ctx.beginPath();
      for (let t = 0; t <= Math.PI * 3.7; t += 0.12) {
        const r = 3 + t * 2;
        const x = 55 + Math.cos(t + Math.PI) * r;
        const y = 62 + Math.sin(t + Math.PI) * r;
        if (t === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ellipse(ctx, 44, 46, 8, 4, -0.6, 'rgba(255,255,255,0.6)');
    });

    // ── Star: faceted gold star with a bright bevel ──
    this.createCanvasTexture('pu_icon_star', S, S, (ctx) => {
      ctx.lineJoin = 'round';
      starPath(ctx, C, 66, 46, 20);
      const gold = ctx.createLinearGradient(30, 22, 98, 110);
      gold.addColorStop(0, '#fff7c2');
      gold.addColorStop(0.45, '#ffd23f');
      gold.addColorStop(1, '#e89400');
      ctx.fillStyle = gold;
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = 5;
      ctx.stroke();
      // facets: lighter inner star + lines from centre to each point
      starPath(ctx, C, 66, 28, 12);
      ctx.fillStyle = 'rgba(255,248,200,0.55)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(160,95,0,0.45)';
      ctx.lineWidth = 2;
      for (let i = 0; i < 5; i++) {
        const a = (Math.PI * 2 / 5) * i - Math.PI / 2;
        ctx.beginPath();
        ctx.moveTo(C, 66);
        ctx.lineTo(C + Math.cos(a) * 42, 66 + Math.sin(a) * 42);
        ctx.stroke();
      }
      ellipse(ctx, 52, 50, 8, 4, -0.6, 'rgba(255,255,255,0.85)');
    });

    // ── Shield: steel heater shield, blue field, gold star crest ──
    const shieldPath = (ctx, inset = 0) => {
      ctx.beginPath();
      ctx.moveTo(C, 16 + inset);
      ctx.quadraticCurveTo(84, 28 + inset, 102 - inset, 24 + inset);
      ctx.quadraticCurveTo(104 - inset, 82, C, 114 - inset * 1.5);
      ctx.quadraticCurveTo(24 + inset, 82, 26 + inset, 24 + inset);
      ctx.quadraticCurveTo(44, 28 + inset, C, 16 + inset);
      ctx.closePath();
    };
    this.createCanvasTexture('pu_icon_shield', S, S, (ctx) => {
      ctx.lineJoin = 'round';
      shieldPath(ctx);
      const steel = ctx.createLinearGradient(26, 16, 102, 114);
      steel.addColorStop(0, '#ffffff');
      steel.addColorStop(1, '#a9bdd6');
      ctx.fillStyle = steel;
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = 5;
      ctx.stroke();
      shieldPath(ctx, 9);
      const field = ctx.createLinearGradient(40, 24, 90, 104);
      field.addColorStop(0, '#6cc4ff');
      field.addColorStop(1, '#1d5bb5');
      ctx.fillStyle = field;
      ctx.fill();
      ctx.strokeStyle = 'rgba(15,40,80,0.5)';
      ctx.lineWidth = 2.5;
      ctx.stroke();
      starPath(ctx, C, 62, 17, 7.5);
      ctx.fillStyle = '#ffd23f';
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = 3;
      ctx.stroke();
      ellipse(ctx, 46, 42, 7, 4, -0.7, 'rgba(255,255,255,0.7)');
    });

    // ── WiFi (Department's WiFi Boost): signal arcs ──
    this.createCanvasTexture('pu_icon_wifi', S, S, (ctx) => {
      ctx.lineCap = 'round';
      [[40, 0], [27, 1], [14, 2]].forEach(([r]) => {
        ctx.beginPath();
        ctx.arc(C, 86, r, Math.PI * 1.22, Math.PI * 1.78);
        ctx.strokeStyle = INK;
        ctx.lineWidth = 14;
        ctx.stroke();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 7;
        ctx.stroke();
      });
      ellipse(ctx, C, 88, 7.5, 7.5, 0, '#ffffff', INK, 4);
    });

    // Active shield bubble around the bird
    this.createCanvasTexture('shield_bubble', 120, 120, (ctx) => {
      const g = ctx.createRadialGradient(60, 60, 20, 60, 60, 58);
      g.addColorStop(0, 'rgba(140,210,255,0)');
      g.addColorStop(0.75, 'rgba(140,210,255,0.16)');
      g.addColorStop(0.95, 'rgba(190,235,255,0.55)');
      g.addColorStop(1, 'rgba(190,235,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 120, 120);
      ctx.strokeStyle = 'rgba(210,240,255,0.9)';
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(60, 60, 54, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(60, 60, 46, Math.PI * 1.1, Math.PI * 1.45); ctx.stroke();
    });

    // Speed streak for the rabbit boost trail
    this.createCanvasTexture('speed_line', 28, 4, (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, w, 0);
      g.addColorStop(0, 'rgba(255,255,255,0)');
      g.addColorStop(1, 'rgba(255,230,160,0.95)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
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

    // Ground — stone blocks with a grass fringe (tiles seamlessly every 320px)
    this.createCanvasTexture('ground', 320, 60, (ctx, w, h) => {
      ctx.fillStyle = '#2f4553';
      ctx.fillRect(0, 0, w, h);

      // Two staggered rows of rounded stone blocks
      const rows = [
        { y: 12, h: 24, blocks: [0, 58, 104, 170, 222, 276, 320] },
        { y: 38, h: 22, blocks: [-30, 30, 82, 140, 196, 252, 290, 350] },
      ];
      rows.forEach((row) => {
        for (let i = 0; i < row.blocks.length - 1; i++) {
          const x0 = row.blocks[i] + 2;
          const bw = row.blocks[i + 1] - row.blocks[i] - 4;
          [0, w, -w].forEach((wrap) => {
            ctx.fillStyle = '#5a7f93';
            ctx.beginPath();
            ctx.roundRect(x0 + wrap, row.y, bw, row.h - 3, 5);
            ctx.fill();
            ctx.fillStyle = '#7fa2b5';
            ctx.fillRect(x0 + wrap + 4, row.y + 2, bw - 8, 3);
            ctx.fillStyle = 'rgba(0,0,0,0.18)';
            ctx.fillRect(x0 + wrap + 3, row.y + row.h - 8, bw - 6, 4);
          });
        }
      });

      // Grass strip with jagged tufts hanging over the stones
      ctx.fillStyle = '#3f7d1c';
      ctx.fillRect(0, 0, w, 9);
      ctx.fillStyle = '#8fd13f';
      ctx.fillRect(0, 0, w, 6);
      ctx.fillStyle = '#3f7d1c';
      ctx.beginPath();
      ctx.moveTo(0, 8);
      for (let x = 0; x <= w; x += 8) {
        ctx.lineTo(x + 4, 8 + ((x / 8) % 3 === 0 ? 7 : 4));
        ctx.lineTo(x + 8, 8);
      }
      ctx.lineTo(w, 8);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#c6f07a';
      ctx.fillRect(0, 0, w, 2);
    });
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
  }

  createParticleTexture() {
    const p = this.make.graphics({ x: 0, y: 0, add: false });
    p.fillStyle(0xffd700, 1);
    p.fillCircle(4, 4, 4);
    p.generateTexture('particle', 8, 8);
    p.destroy();

    // Glowing spark for wall impacts (hot white core fading to orange)
    this.createCanvasTexture('spark', 16, 16, (ctx, w, h) => {
      const grad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
      grad.addColorStop(0, 'rgba(255,255,255,1)');
      grad.addColorStop(0.35, 'rgba(255,240,170,0.95)');
      grad.addColorStop(0.7, 'rgba(255,150,40,0.5)');
      grad.addColorStop(1, 'rgba(255,120,0,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    });
  }
}
