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
    if (video) {
      video.style.display = show ? 'block' : 'none';
      if (show) video.play().catch(() => {});
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
      fontSize = '18px',
      color = COLORS.white,
      depth = 10,
      playSound = true,
    } = options;

    const bg = scene.add
      .rectangle(x, y, width, height, 0xffffff, 0.12)
      .setStrokeStyle(2, 0xffffff, 0.45)
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
      .setDepth(depth + 1);

    bg.on('pointerover', () => {
      bg.setFillStyle(0xffffff, 0.22);
      bg.setScale(1.04);
      text.setScale(1.04);
    });

    bg.on('pointerout', () => {
      bg.setFillStyle(0xffffff, 0.12);
      bg.setScale(1);
      text.setScale(1);
    });

    const fire = () => {
      if (scene._navigating) return;
      AudioManager.resume();
      if (playSound) AudioManager.playClick(scene);
      if (typeof callback === 'function') callback();
    };

    bg.on('pointerdown', fire);
    return { bg, text };
  }

  static createTitle(scene, y, mainText, subText = '', depth = 10) {
    const title = scene.add
      .text(GAME_WIDTH / 2, y, mainText, {
        fontFamily: 'Orbitron',
        fontSize: '28px',
        color: COLORS.white,
        fontStyle: 'bold',
        align: 'center',
        wordWrap: { width: GAME_WIDTH - 40 },
      })
      .setOrigin(0.5)
      .setDepth(depth)
      .setShadow(0, 2, '#000000', 8, true, true);

    let subtitle = null;
    if (subText) {
      subtitle = scene.add
        .text(GAME_WIDTH / 2, y + 40, subText, {
          fontFamily: 'Inter',
          fontSize: '14px',
          color: 'rgba(255,255,255,0.85)',
          align: 'center',
        })
        .setOrigin(0.5)
        .setDepth(depth)
        .setShadow(0, 1, '#000000', 4, true, true);
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

    if (!VIDEO_SCENES.includes(targetScene)) {
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
