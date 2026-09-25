import { GAME_WIDTH, COLORS } from '../config/constants.js';
import { AudioManager } from './audio.js';

/** Scenes that show campus-bg.mp4 behind transparent canvas */
export const VIDEO_SCENES = [
  'IntroScene',
  'MenuScene',
  'PlayerInfoScene',
  'ModeScene',
  'LeaderboardScene',
];

/**
 * Shared UI helpers — transparent glass over campus video.
 */
export class UIHelper {
  static showVideo(show) {
    const video = document.getElementById('campus-video');
    if (!video) return;

    if (show) {
      video.style.display = 'block';
      // Restart zoom-out animation without layout thrash
      video.style.animation = 'none';
      void video.offsetWidth;
      video.style.animation = '';
      video.play().catch(() => {});
    } else {
      video.style.display = 'none';
      video.style.animation = 'none';
      video.pause();
    }
    document.body.classList.toggle('video-active', show);
  }

  static setVideoBackground(scene) {
    scene.cameras.main.setBackgroundColor('rgba(0,0,0,0)');
    UIHelper.showVideo(true);
  }

  static setOpaqueBackground(scene) {
    UIHelper.showVideo(false);
    scene.cameras.main.setBackgroundColor(COLORS.cstBlueDark);
    document.body.classList.remove('video-active');
  }

  static createGlassOverlay(scene, alpha = 0.12) {
    return scene.add
      .rectangle(GAME_WIDTH / 2, scene.scale.height / 2, GAME_WIDTH, scene.scale.height, 0x000000, alpha)
      .setDepth(0);
  }

  static createButton(scene, x, y, label, callback, options = {}) {
    const {
      width = 220,
      height = 52,
      fontSize = '20px',
      color = COLORS.cstBlueDark,
      depth = 10,
      playSound = true,
      icon = null, // e.g. 'play', 'replay', 'home', 'trophy' — see UIHelper.drawIcon
      style = 'default', // 'default', 'primary', 'secondary'
    } = options;

    // Style configurations — solid, high-contrast fills so buttons read clearly over video/game backgrounds
    const styleConfigs = {
      default: {
        fillColor: 0xf4f6fa,
        fillAlpha: 0.95,
        strokeColor: COLORS.gold,
        strokeAlpha: 1,
        hoverFill: 0xffffff,
        hoverAlpha: 1,
        textColor: COLORS.cstBlueDark,
      },
      primary: {
        fillColor: 0xffd700,
        fillAlpha: 0.97,
        strokeColor: 0xffffff,
        strokeAlpha: 0.9,
        hoverFill: 0xffe14d,
        hoverAlpha: 1,
        textColor: COLORS.cstBlueDark,
      },
      secondary: {
        fillColor: 0x1fbf7a,
        fillAlpha: 0.95,
        strokeColor: 0xffffff,
        strokeAlpha: 0.85,
        hoverFill: 0x2ad98e,
        hoverAlpha: 1,
        textColor: '#0a2e20',
      },
    };

    const config = styleConfigs[style] || styleConfigs.default;
    const textColor = options.color || config.textColor;

    // Drop shadow for lift against busy backgrounds
    const shadow = scene.add
      .rectangle(x + 2, y + 3, width, height, 0x000000, 0.35)
      .setDepth(depth - 1);

    const bg = scene.add
      .rectangle(x, y, width, height, config.fillColor, config.fillAlpha)
      .setStrokeStyle(3, config.strokeColor, config.strokeAlpha)
      .setInteractive({ useHandCursor: true })
      .setDepth(depth);

    const hasIcon = Boolean(icon);
    const textX = hasIcon ? x + 12 : x;

    const text = scene.add
      .text(textX, y, label, {
        fontFamily: 'Orbitron',
        fontSize,
        color: textColor,
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(depth + 1)
      .setInteractive({ useHandCursor: true });

    let iconGfx = null;
    if (hasIcon) {
      const iconX = textX - text.width / 2 - 16;
      iconGfx = UIHelper.drawIcon(scene, icon, iconX, y, Math.min(height * 0.4, 16), textColor, depth + 1);
    }

    bg.on('pointerover', () => {
      bg.setFillStyle(config.hoverFill, config.hoverAlpha);
      bg.setScale(1.05);
      text.setScale(1.05);
      iconGfx?.setScale(1.05);
    });

    bg.on('pointerout', () => {
      bg.setFillStyle(config.fillColor, config.fillAlpha);
      bg.setScale(1);
      text.setScale(1);
      iconGfx?.setScale(1);
    });

    const fire = (pointer, localX, localY, event) => {
      if (scene._navigating) return;
      event?.stopPropagation?.();
      AudioManager.resume();
      if (playSound) AudioManager.playClick(scene);
      if (typeof callback === 'function') callback();
    };

    bg.on('pointerup', fire);
    text.on('pointerup', fire);
    scene.events.once('shutdown', () => shadow.destroy());
    return { bg, text, shadow, icon: iconGfx };
  }

  /**
   * Draw a small vector icon glyph at (x, y) using Phaser Graphics — avoids emoji font rendering.
   * @param {Phaser.Scene} scene
   * @param {string} type - icon key (see switch below)
   * @param {number} x
   * @param {number} y
   * @param {number} size - roughly half-height of the glyph
   * @param {string|number} color - hex string or number
   * @param {number} depth
   */
  static drawIcon(scene, type, x, y, size = 12, color = COLORS.gold, depth = 10) {
    const colorNum = typeof color === 'string' ? Phaser.Display.Color.HexStringToColor(color).color : color;
    const g = scene.add.graphics({ x, y }).setDepth(depth);
    g.lineStyle(Math.max(2, size * 0.16), colorNum, 1);
    g.fillStyle(colorNum, 1);

    switch (type) {
      case 'play': {
        g.fillTriangle(-size * 0.4, -size * 0.6, -size * 0.4, size * 0.6, size * 0.6, 0);
        break;
      }
      case 'replay': {
        g.beginPath();
        g.arc(0, 0, size * 0.6, Phaser.Math.DegToRad(-40), Phaser.Math.DegToRad(230), false);
        g.strokePath();
        g.fillTriangle(size * 0.45, -size * 0.75, size * 0.9, -size * 0.35, size * 0.3, -size * 0.15);
        break;
      }
      case 'home': {
        g.beginPath();
        g.moveTo(-size * 0.7, 0);
        g.lineTo(0, -size * 0.6);
        g.lineTo(size * 0.7, 0);
        g.strokePath();
        g.fillRect(-size * 0.4, 0, size * 0.8, size * 0.6);
        break;
      }
      case 'back': {
        g.beginPath();
        g.moveTo(size * 0.35, -size * 0.6);
        g.lineTo(-size * 0.35, 0);
        g.lineTo(size * 0.35, size * 0.6);
        g.strokePath();
        break;
      }
      case 'forward': {
        g.beginPath();
        g.moveTo(-size * 0.35, -size * 0.6);
        g.lineTo(size * 0.35, 0);
        g.lineTo(-size * 0.35, size * 0.6);
        g.strokePath();
        break;
      }
      case 'trophy': {
        g.fillRect(-size * 0.35, -size * 0.5, size * 0.7, size * 0.6);
        g.beginPath();
        g.arc(-size * 0.35, -size * 0.35, size * 0.25, Phaser.Math.DegToRad(90), Phaser.Math.DegToRad(270));
        g.strokePath();
        g.beginPath();
        g.arc(size * 0.35, -size * 0.35, size * 0.25, Phaser.Math.DegToRad(-90), Phaser.Math.DegToRad(90));
        g.strokePath();
        g.fillRect(-size * 0.15, size * 0.1, size * 0.3, size * 0.3);
        g.fillRect(-size * 0.35, size * 0.4, size * 0.7, size * 0.12);
        break;
      }
      case 'medal': {
        g.fillCircle(0, size * 0.1, size * 0.5);
        g.lineStyle(Math.max(2, size * 0.14), colorNum, 1);
        g.strokeCircle(0, size * 0.1, size * 0.5);
        break;
      }
      case 'student': {
        // graduation cap, viewed from above: diamond board + center boss + hanging tassel
        g.fillTriangle(-size * 0.75, 0, 0, -size * 0.42, size * 0.75, 0);
        g.fillTriangle(-size * 0.75, 0, 0, size * 0.42, size * 0.75, 0);
        g.fillCircle(0, 0, size * 0.12);
        g.lineStyle(Math.max(2, size * 0.16), colorNum, 1);
        g.lineBetween(size * 0.4, size * 0.05, size * 0.4, size * 0.55);
        g.fillCircle(size * 0.4, size * 0.6, size * 0.09);
        break;
      }
      case 'lecturer': {
        // person silhouette: round head + shoulders arc, well within bounds
        g.fillCircle(0, -size * 0.38, size * 0.34);
        g.beginPath();
        g.arc(0, size * 0.62, size * 0.58, Phaser.Math.DegToRad(200), Phaser.Math.DegToRad(340), false);
        g.closePath();
        g.fillPath();
        break;
      }
      case 'sound-on': {
        g.fillRect(-size * 0.6, -size * 0.25, size * 0.3, size * 0.5);
        g.fillTriangle(-size * 0.3, -size * 0.25, -size * 0.3, size * 0.25, size * 0.15, -size * 0.55);
        g.fillTriangle(-size * 0.3, -size * 0.25, -size * 0.3, size * 0.25, size * 0.15, size * 0.55);
        g.beginPath();
        g.arc(size * 0.05, 0, size * 0.55, Phaser.Math.DegToRad(-45), Phaser.Math.DegToRad(45));
        g.strokePath();
        break;
      }
      case 'sound-off': {
        g.fillRect(-size * 0.6, -size * 0.25, size * 0.3, size * 0.5);
        g.fillTriangle(-size * 0.3, -size * 0.25, -size * 0.3, size * 0.25, size * 0.15, -size * 0.55);
        g.fillTriangle(-size * 0.3, -size * 0.25, -size * 0.3, size * 0.25, size * 0.15, size * 0.55);
        g.lineBetween(size * 0.25, -size * 0.4, size * 0.75, size * 0.4);
        g.lineBetween(size * 0.75, -size * 0.4, size * 0.25, size * 0.4);
        break;
      }
      case 'camera': {
        g.strokeRoundedRect(-size * 0.7, -size * 0.35, size * 1.4, size * 0.75, size * 0.12);
        g.lineBetween(-size * 0.25, -size * 0.35, -size * 0.1, -size * 0.55);
        g.lineBetween(-size * 0.1, -size * 0.55, size * 0.15, -size * 0.55);
        g.lineBetween(size * 0.15, -size * 0.55, size * 0.3, -size * 0.35);
        g.strokeCircle(0, 0.05 * size, size * 0.22);
        break;
      }
      case 'upload': {
        g.lineBetween(0, size * 0.5, 0, -size * 0.15);
        g.fillTriangle(-size * 0.35, -size * 0.1, size * 0.35, -size * 0.1, 0, -size * 0.6);
        g.lineBetween(-size * 0.5, size * 0.55, size * 0.5, size * 0.55);
        break;
      }
      case 'trash': {
        g.strokeRect(-size * 0.35, -size * 0.15, size * 0.7, size * 0.65);
        g.lineBetween(-size * 0.55, -size * 0.35, size * 0.55, -size * 0.35);
        g.lineBetween(-size * 0.2, -size * 0.35, -size * 0.15, -size * 0.55);
        g.lineBetween(size * 0.2, -size * 0.35, size * 0.15, -size * 0.55);
        g.lineBetween(-size * 0.15, -size * 0.55, size * 0.15, -size * 0.55);
        break;
      }
      case 'check': {
        g.lineStyle(Math.max(3, size * 0.22), colorNum, 1);
        g.beginPath();
        g.moveTo(-size * 0.5, 0);
        g.lineTo(-size * 0.1, size * 0.4);
        g.lineTo(size * 0.55, -size * 0.4);
        g.strokePath();
        break;
      }
      case 'cross': {
        g.lineStyle(Math.max(3, size * 0.22), colorNum, 1);
        g.lineBetween(-size * 0.45, -size * 0.45, size * 0.45, size * 0.45);
        g.lineBetween(size * 0.45, -size * 0.45, -size * 0.45, size * 0.45);
        break;
      }
      case 'star': {
        const points = [];
        const spikes = 5;
        const outer = size * 0.62;
        const inner = size * 0.26;
        for (let i = 0; i < spikes * 2; i++) {
          const r = i % 2 === 0 ? outer : inner;
          const a = (Math.PI / spikes) * i - Math.PI / 2;
          points.push(new Phaser.Math.Vector2(Math.cos(a) * r, Math.sin(a) * r));
        }
        g.fillPoints(points, true);
        break;
      }
      case 'flame': {
        g.beginPath();
        g.moveTo(0, size * 0.6);
        g.lineTo(-size * 0.4, size * 0.05);
        g.lineTo(-size * 0.15, size * 0.05);
        g.lineTo(-size * 0.3, -size * 0.6);
        g.lineTo(size * 0.2, -size * 0.05);
        g.lineTo(0, -size * 0.05);
        g.lineTo(size * 0.4, size * 0.15);
        g.closePath();
        g.fillPath();
        break;
      }
      case 'target': {
        g.lineStyle(Math.max(2, size * 0.14), colorNum, 1);
        g.strokeCircle(0, 0, size * 0.6);
        g.strokeCircle(0, 0, size * 0.3);
        g.fillCircle(0, 0, size * 0.08);
        break;
      }
      case 'book': {
        g.fillRoundedRect(-size * 0.55, -size * 0.5, size * 0.5, size, size * 0.06);
        g.fillRoundedRect(size * 0.05, -size * 0.5, size * 0.5, size, size * 0.06);
        g.lineBetween(0, -size * 0.45, 0, size * 0.45);
        break;
      }
      case 'exam': {
        g.strokeRoundedRect(-size * 0.45, -size * 0.6, size * 0.9, size * 1.2, size * 0.08);
        g.lineBetween(-size * 0.25, -size * 0.25, size * 0.25, -size * 0.25);
        g.lineBetween(-size * 0.25, size * 0.05, size * 0.25, size * 0.05);
        g.lineBetween(-size * 0.25, size * 0.35, size * 0.05, size * 0.35);
        break;
      }
      case 'assignment': {
        g.strokeRoundedRect(-size * 0.45, -size * 0.55, size * 0.9, size * 1.1, size * 0.08);
        g.fillStyle(colorNum, 1);
        g.fillTriangle(-size * 0.2, size * 0.05, -size * 0.05, size * 0.2, size * 0.3, -size * 0.2);
        g.lineStyle(Math.max(2, size * 0.16), colorNum, 1);
        break;
      }
      case 'pin': {
        g.fillCircle(0, -size * 0.15, size * 0.4);
        g.fillTriangle(-size * 0.28, size * 0.05, size * 0.28, size * 0.05, 0, size * 0.65);
        break;
      }
      case 'clock': {
        g.lineStyle(Math.max(2, size * 0.14), colorNum, 1);
        g.strokeCircle(0, 0, size * 0.6);
        g.lineBetween(0, 0, 0, -size * 0.35);
        g.lineBetween(0, 0, size * 0.28, size * 0.1);
        break;
      }
      case 'shield': {
        g.beginPath();
        g.moveTo(0, -size * 0.65);
        g.lineTo(size * 0.55, -size * 0.35);
        g.lineTo(size * 0.5, size * 0.15);
        g.lineTo(0, size * 0.65);
        g.lineTo(-size * 0.5, size * 0.15);
        g.lineTo(-size * 0.55, -size * 0.35);
        g.closePath();
        g.fillPath();
        break;
      }
      case 'coffee': {
        g.strokeRoundedRect(-size * 0.5, -size * 0.35, size * 0.85, size * 0.75, size * 0.1);
        g.beginPath();
        g.arc(size * 0.42, -size * 0.05, size * 0.22, Phaser.Math.DegToRad(-70), Phaser.Math.DegToRad(90));
        g.strokePath();
        break;
      }
      default:
        g.fillCircle(0, 0, size * 0.5);
    }

    return g;
  }

  /** Draw a rank medal icon (gold/silver/bronze for top 3, plain number badge otherwise). */
  static drawRankBadge(scene, x, y, rank, depth = 10) {
    const rankColors = ['#FFD700', '#C0C0C0', '#CD7F32'];
    if (rank <= 3) {
      const color = rankColors[rank - 1];
      UIHelper.drawIcon(scene, 'medal', x, y, 11, color, depth);
      return scene.add.text(x, y, String(rank), {
        fontFamily: 'Orbitron', fontSize: '10px', color: '#1a1a2e', fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(depth + 1);
    }
    return scene.add.text(x, y, `#${rank}`, {
      fontFamily: 'Orbitron', fontSize: '11px', color: COLORS.gold, fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(depth);
  }

  static createTitle(scene, y, mainText, subText = '', depth = 10) {
    // Title background glow
    scene.add
      .rectangle(GAME_WIDTH / 2, y + 8, GAME_WIDTH - 40, 100, 0x0094db, 0.08)
      .setDepth(depth - 1)
      .setAlpha(0.5);

    const title = scene.add
      .text(GAME_WIDTH / 2, y, mainText, {
        fontFamily: 'Orbitron',
        fontSize: '32px',
        color: COLORS.gold,
        fontStyle: 'bold',
        align: 'center',
        wordWrap: { width: GAME_WIDTH - 40 },
        stroke: '#0067B1',
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(depth)
      .setShadow(0, 3, '#000000', 10, true, true);

    let subtitle = null;
    if (subText) {
      subtitle = scene.add
        .text(GAME_WIDTH / 2, y + 48, subText, {
          fontFamily: 'Inter',
          fontSize: '16px',
          color: COLORS.silver,
          align: 'center',
          fontStyle: 'bold',
        })
        .setOrigin(0.5)
        .setDepth(depth)
        .setShadow(0, 2, '#000000', 5, true, true);
    }

    return { title, subtitle };
  }

  static createBackgroundParticles(scene, count = 12) {
    for (let i = 0; i < count; i++) {
      const dot = scene.add
        .circle(
          Phaser.Math.Between(0, GAME_WIDTH),
          Phaser.Math.Between(0, scene.scale.height),
          Phaser.Math.Between(1, 2),
          0xffffff,
          Phaser.Math.FloatBetween(0.05, 0.15)
        )
        .setDepth(1);

      scene.tweens.add({
        targets: dot,
        y: dot.y - Phaser.Math.Between(20, 60),
        alpha: 0,
        duration: Phaser.Math.Between(3000, 5000),
        repeat: -1,
        delay: Phaser.Math.Between(0, 2000),
        onRepeat: () => {
          dot.y = scene.scale.height + 10;
          dot.x = Phaser.Math.Between(0, GAME_WIDTH);
          dot.alpha = Phaser.Math.FloatBetween(0.05, 0.15);
        },
      });
    }
  }

  static createCard(scene, x, y, width, height, depth = 2) {
    const card = scene.add
      .rectangle(x, y, width, height, 0x0067b1, 0.25)
      .setStrokeStyle(2, COLORS.gold, 0.5)
      .setDepth(depth);
    return card;
  }

  static createSectionLabel(scene, x, y, text, depth = 10) {
    return scene.add
      .text(x, y, text, {
        fontFamily: 'Orbitron',
        fontSize: '13px',
        color: COLORS.silver,
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(depth)
      .setShadow(0, 1, '#000', 3, true, true);
  }

  /**
   * Block double-taps while leaving a scene. Phaser reuses scene instances, so the flag
   * must be cleared on shutdown — otherwise the next visit to that scene (e.g. the second
   * Game Over) starts with every button ignored.
   */
  static lockNavigation(scene) {
    if (scene._navigating) return false;
    scene._navigating = true;
    scene.events.once('shutdown', () => { scene._navigating = false; });
    return true;
  }

  static goToScene(scene, targetScene, data = {}) {
    if (!UIHelper.lockNavigation(scene)) return;
    AudioManager.resume();

    if (!VIDEO_SCENES.includes(targetScene)) {
      UIHelper.showVideo(false);
    } else {
      UIHelper.showVideo(true);
    }

    scene.scene.start(targetScene, data);
  }

  static fadeToScene(scene, targetScene, data = {}, duration = 250) {
    if (!UIHelper.lockNavigation(scene)) return;
    AudioManager.resume();

    if (VIDEO_SCENES.includes(targetScene)) {
      UIHelper.showVideo(true);
    } else {
      UIHelper.showVideo(false);
    }

    scene.cameras.main.fadeOut(duration, 0, 0, 0);
    scene.time.delayedCall(duration, () => {
      scene.scene.start(targetScene, data);
    });
  }

  static fadeIn(scene, duration = 350) {
    scene.cameras.main.fadeIn(duration, 0, 0, 0);
  }

  static createTapZone(scene, callback, depth = 50) {
    const zone = scene.add
      .rectangle(GAME_WIDTH / 2, scene.scale.height / 2, GAME_WIDTH, scene.scale.height, 0x000000, 0.001)
      .setInteractive({ useHandCursor: true })
      .setDepth(depth);

    const handler = () => {
      if (scene._navigating) return;
      AudioManager.resume();
      callback?.();
    };

    zone.once('pointerdown', handler);
    scene.input.keyboard?.once('keydown-SPACE', handler);
    scene.input.keyboard?.once('keydown-ENTER', handler);
    return zone;
  }
}
