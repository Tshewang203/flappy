import { GAME_WIDTH, COLORS } from '../config/constants.js';
import { AudioManager } from './audio.js';

/** Scenes that show campus-bg.mp4 behind transparent canvas */
export const VIDEO_SCENES = [
  'IntroScene',
  'MenuScene',
  'PlayerInfoScene',
  'ModeScene',
  'LeaderboardScene',
  'HallOfFameScene',
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
      color = COLORS.gold,
      depth = 10,
      playSound = true,
      style = 'default', // 'default', 'primary', 'secondary'
    } = options;

    // Style configurations
    const styleConfigs = {
      default: { 
        fillColor: 0xffffff, 
        fillAlpha: 0.12, 
        strokeColor: 0xffffff, 
        strokeAlpha: 0.45,
        hoverFill: 0xffffff,
        hoverAlpha: 0.22,
      },
      primary: { 
        fillColor: 0x0094db, 
        fillAlpha: 0.35, 
        strokeColor: COLORS.gold, 
        strokeAlpha: 0.8,
        hoverFill: 0x0094db,
        hoverAlpha: 0.55,
      },
      secondary: { 
        fillColor: 0x00aa77, 
        fillAlpha: 0.25, 
        strokeColor: 0x00ff88, 
        strokeAlpha: 0.6,
        hoverFill: 0x00aa77,
        hoverAlpha: 0.45,
      },
    };

    const config = styleConfigs[style] || styleConfigs.default;

    const bg = scene.add
      .rectangle(x, y, width, height, config.fillColor, config.fillAlpha)
      .setStrokeStyle(2, config.strokeColor, config.strokeAlpha)
      .setInteractive({ useHandCursor: true })
      .setDepth(depth);

    const text = scene.add
      .text(x, y, label, {
        fontFamily: 'Orbitron',
        fontSize,
        color,
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(depth + 1)
      .setInteractive({ useHandCursor: true });

    // Add glow effect on hover
    const glowShadow = scene.make.graphics({ x: 0, y: 0, add: false });
    glowShadow.setDepth(depth - 1);

    bg.on('pointerover', () => {
      bg.setFillStyle(config.hoverFill, config.hoverAlpha);
      bg.setScale(1.06);
      text.setScale(1.06);
      text.setColor(COLORS.gold);
    });

    bg.on('pointerout', () => {
      bg.setFillStyle(config.fillColor, config.fillAlpha);
      bg.setScale(1);
      text.setScale(1);
      text.setColor(color);
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
    return { bg, text };
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

  static goToScene(scene, targetScene, data = {}) {
    if (scene._navigating) return;
    scene._navigating = true;
    AudioManager.resume();

    if (!VIDEO_SCENES.includes(targetScene)) {
      UIHelper.showVideo(false);
    } else {
      UIHelper.showVideo(true);
    }

    scene.scene.start(targetScene, data);
  }

  static fadeToScene(scene, targetScene, data = {}, duration = 250) {
    if (scene._navigating) return;
    scene._navigating = true;
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
