import { GAME_WIDTH, COLORS } from '../config/constants.js';

/**
 * Shared UI helpers for consistent silver-jubilee styling.
 */
export class UIHelper {
  /**
   * Create a styled button with hover/press effects.
   * @returns {{ container: Phaser.GameObjects.Container, bg: Phaser.GameObjects.Image }}
   */
  static createButton(scene, x, y, label, callback, options = {}) {
    const {
      width = 220,
      height = 52,
      fontSize = '18px',
      color = COLORS.silver,
      glowColor = 0xc0c0c0,
    } = options;

    const container = scene.add.container(x, y);

    const bg = scene.add
      .image(0, 0, 'btn_bg')
      .setDisplaySize(width, height)
      .setInteractive({ useHandCursor: true });

    const text = scene.add
      .text(0, 0, label, {
        fontFamily: 'Orbitron',
        fontSize,
        color,
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    container.add([bg, text]);
    container.setSize(width, height);

    bg.on('pointerover', () => {
      bg.setTint(0xdddddd);
      scene.tweens.add({
        targets: container,
        scaleX: 1.05,
        scaleY: 1.05,
        duration: 150,
        ease: 'Back.easeOut',
      });
    });

    bg.on('pointerout', () => {
      bg.clearTint();
      scene.tweens.add({
        targets: container,
        scaleX: 1,
        scaleY: 1,
        duration: 150,
      });
    });

    bg.on('pointerdown', () => {
      scene.tweens.add({
        targets: container,
        scaleX: 0.95,
        scaleY: 0.95,
        duration: 80,
        yoyo: true,
        onComplete: () => callback?.(),
      });
    });

    return { container, bg, text };
  }

  /** Animated title with glow pulse */
  static createTitle(scene, y, mainText, subText = '') {
    const title = scene.add
      .text(GAME_WIDTH / 2, y, mainText, {
        fontFamily: 'Orbitron',
        fontSize: '28px',
        color: COLORS.silver,
        fontStyle: 'bold',
        align: 'center',
        wordWrap: { width: GAME_WIDTH - 40 },
      })
      .setOrigin(0.5)
      .setShadow(0, 0, COLORS.gold || '#ffd700', 8, true, true);

    scene.tweens.add({
      targets: title,
      alpha: { from: 0.85, to: 1 },
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    let subtitle = null;
    if (subText) {
      subtitle = scene.add
        .text(GAME_WIDTH / 2, y + 40, subText, {
          fontFamily: 'Inter',
          fontSize: '14px',
          color: COLORS.textMuted,
          align: 'center',
        })
        .setOrigin(0.5);
    }

    return { title, subtitle };
  }

  /** Decorative silver particles floating in background */
  static createBackgroundParticles(scene, count = 20) {
    const particles = [];
    for (let i = 0; i < count; i++) {
      const dot = scene.add
        .circle(
          Phaser.Math.Between(0, GAME_WIDTH),
          Phaser.Math.Between(0, scene.scale.height),
          Phaser.Math.Between(1, 3),
          0xc0c0c0,
          Phaser.Math.FloatBetween(0.1, 0.4)
        )
        .setDepth(-1);

      scene.tweens.add({
        targets: dot,
        y: dot.y - Phaser.Math.Between(30, 80),
        alpha: { from: dot.alpha, to: 0 },
        duration: Phaser.Math.Between(3000, 6000),
        repeat: -1,
        delay: Phaser.Math.Between(0, 3000),
        onRepeat: () => {
          dot.y = scene.scale.height + 10;
          dot.x = Phaser.Math.Between(0, GAME_WIDTH);
        },
      });

      particles.push(dot);
    }
    return particles;
  }

  /** Fade transition to another scene */
  static fadeToScene(scene, targetScene, data = {}, duration = 400) {
    scene.cameras.main.fadeOut(duration, 15, 31, 51);
    scene.time.delayedCall(duration, () => {
      scene.scene.start(targetScene, data);
    });
  }

  /** Scene fade-in on start */
  static fadeIn(scene, duration = 400) {
    scene.cameras.main.fadeIn(duration, 15, 31, 51);
  }
}
