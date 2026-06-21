import {
  GAME_WIDTH,
  GAME_HEIGHT,
  MODE_CONFIG,
  JOURNEY_MILESTONES,
  GRAVITY,
  JUMP_VELOCITY,
  MAX_FALL_SPEED,
  POWER_UPS,
} from '../config/constants.js';
import { getPlayer } from '../utils/storage.js';

/**
 * GameScene — Core endless Flappy Bird gameplay with three modes.
 */
export class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  init(data) {
    this.mode = data.mode || 'flappy_cst';
    this.config = MODE_CONFIG[this.mode];
    this.player = getPlayer();
    this.score = 0;
    this.isGameOver = false;
    this.isStarted = false;
    this.gameSpeed = this.config.initialSpeed;
    this.pipeGap = this.config.initialGap;
    this.pipeTimer = 0;
    this.scoreTimer = 0;

    // Power-up state
    this.activePowerUps = {};
    this.hasShield = false;
    this.scoreMultiplier = 1;
    this.slowMotion = false;

    // Journey mode
    this.currentEra = 0;
    this.bgKeys = ['bg_foundation', 'bg_growth', 'bg_expansion', 'bg_innovation', 'bg_jubilee'];
    this.pipeKeys = ['pipe_silver', 'pipe_blue', 'pipe_purple', 'pipe_red'];
  }

  create() {
    this.cameras.main.fadeIn(300);

    // Background
    this.bg = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, this.bgKeys[0]).setDepth(-2);

    // Era label for journey mode
    if (this.mode === 'journey') {
      this.eraText = this.add
        .text(GAME_WIDTH / 2, 50, JOURNEY_MILESTONES[0].era, {
          fontFamily: 'Orbitron',
          fontSize: '13px',
          color: '#ffd700',
        })
        .setOrigin(0.5)
        .setDepth(5)
        .setAlpha(0.8);
    }

    // Groups
    this.pipes = this.physics.add.group();
    this.powerUps = this.physics.add.group();
    this.obstacleLabels = this.add.group();

    // Ground (scrolling)
    this.ground = this.add.tileSprite(GAME_WIDTH / 2, GAME_HEIGHT - 30, GAME_WIDTH, 60, 'ground');
    this.ground.setDepth(10);

    // Invisible ground collider
    this.groundBody = this.physics.add.staticGroup();
    const groundCollider = this.groundBody.create(GAME_WIDTH / 2, GAME_HEIGHT - 5, null);
    groundCollider.setSize(GAME_WIDTH, 10).setVisible(false);

    // Bird / student avatar
    this.bird = this.physics.add.sprite(100, GAME_HEIGHT / 2, 'bird');
    this.bird.setCollideWorldBounds(true);
    this.bird.body.setSize(32, 26);
    this.bird.body.setOffset(6, 5);
    this.bird.setDepth(5);
    this.bird.setGravityY(0); // gravity applied manually for control

    // Shield visual
    this.shieldFx = this.add.image(this.bird.x, this.bird.y, 'shield_fx').setVisible(false).setDepth(6);

    // Collisions
    this.physics.add.overlap(this.bird, this.pipes, this.hitPipe, null, this);
    this.physics.add.overlap(this.bird, this.powerUps, this.collectPowerUp, null, this);
    this.physics.add.collider(this.bird, this.groundBody, this.hitGround, null, this);

    // Launch UI overlay scene
    this.scene.launch('UIScene', {
      mode: this.mode,
      player: this.player,
    });

    // Input
    this.input.on('pointerdown', () => this.handleJump());
    this.input.keyboard.on('keydown-SPACE', () => this.handleJump());

    // Ready prompt
    this.readyText = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 50, 'Tap or Press SPACE\nto Start', {
        fontFamily: 'Orbitron',
        fontSize: '20px',
        color: '#c0c0c0',
        align: 'center',
      })
      .setOrigin(0.5)
      .setDepth(20);

    this.tweens.add({
      targets: this.readyText,
      alpha: { from: 1, to: 0.4 },
      duration: 800,
      yoyo: true,
      repeat: -1,
    });

    // Score particles
    this.scoreEmitter = this.add.particles(0, 0, 'particle', {
      speed: { min: 50, max: 150 },
      scale: { start: 0.6, end: 0 },
      lifespan: 400,
      emitting: false,
    }).setDepth(15);
  }

  handleJump() {
    if (this.isGameOver) return;

    if (!this.isStarted) {
      this.startGame();
      return;
    }

    this.bird.setVelocityY(JUMP_VELOCITY);

    // Tilt up
    this.tweens.add({
      targets: this.bird,
      angle: -20,
      duration: 100,
      onComplete: () => {
        this.tweens.add({
          targets: this.bird,
          angle: { from: -20, to: 45 },
          duration: 500,
        });
      },
    });
  }

  startGame() {
    this.isStarted = true;
    this.bird.setGravityY(GRAVITY);
    this.readyText.destroy();

    this.events.emit('gameStarted');
  }

  update(time, delta) {
    if (this.isGameOver) return;

    const dt = this.slowMotion ? delta * 0.5 : delta;
    const dtScale = dt / 16.67;

    // Cap fall speed
    if (this.bird.body.velocity.y > MAX_FALL_SPEED) {
      this.bird.setVelocityY(MAX_FALL_SPEED);
    }

    // Shield follows bird
    if (this.hasShield) {
      this.shieldFx.setPosition(this.bird.x, this.bird.y);
    }

    if (!this.isStarted) return;

    // Scroll ground
    this.ground.tilePositionX += this.gameSpeed * 0.02 * dtScale;

    // Spawn pipes
    this.pipeTimer += dt;
    const spawnRate = this.slowMotion
      ? this.config.spawnInterval * 1.5
      : this.config.spawnInterval;

    if (this.pipeTimer >= spawnRate) {
      this.pipeTimer = 0;
      this.spawnPipePair();
    }

    // Move pipes & power-ups
    const speed = this.gameSpeed * dtScale * 0.06;
    this.pipes.getChildren().forEach((pipe) => {
      pipe.x -= speed;
      if (pipe.x < -100) pipe.destroy();
    });

    this.powerUps.getChildren().forEach((pu) => {
      pu.x -= speed;
      if (pu.x < -50) pu.destroy();
    });

    // Move obstacle labels
    this.obstacleLabels.getChildren().forEach((label) => {
      label.x -= speed;
      if (label.x < -50) label.destroy();
    });

    // Score over time
    this.scoreTimer += dt;
    if (this.scoreTimer >= 500) {
      this.scoreTimer = 0;
      this.addScore(1);
    }

    // Increase difficulty gradually
    if (this.score > 0 && this.score % 5 === 0) {
      this.gameSpeed = Math.min(
        this.config.maxSpeed,
        this.config.initialSpeed + this.score * 2
      );
      this.pipeGap = Math.max(
        this.config.minGap,
        this.config.initialGap - this.score * 0.8
      );
    }

    // Journey mode background transitions
    if (this.mode === 'journey') {
      this.updateJourneyBackground();
    }
  }

  spawnPipePair() {
    const minY = 120;
    const maxY = GAME_HEIGHT - 120 - this.pipeGap;
    const gapCenter = Phaser.Math.Between(minY + this.pipeGap / 2, maxY);

    const pipeKey = this.pipeKeys[Math.min(this.currentEra, this.pipeKeys.length - 1)];
    const obstacleType = Phaser.Utils.Array.GetRandom(this.config.obstacles);

    // Top pipe
    const topH = gapCenter - this.pipeGap / 2;
    const topPipe = this.pipes.create(GAME_WIDTH + 50, topH / 2, pipeKey);
    topPipe.setDisplaySize(80, topH);
    topPipe.body.setSize(70, topH);
    topPipe.setDepth(2);
    topPipe.setFlipY(true);

    // Bottom pipe
    const bottomY = gapCenter + this.pipeGap / 2;
    const bottomH = GAME_HEIGHT - bottomY - 60;
    const bottomPipe = this.pipes.create(GAME_WIDTH + 50, bottomY + bottomH / 2, pipeKey);
    bottomPipe.setDisplaySize(80, bottomH);
    bottomPipe.body.setSize(70, bottomH);
    bottomPipe.setDepth(2);

    // Obstacle emoji label on top pipe
    const emojiMap = {
      book: '📚', exam: '📝', assignment: '📋',
      bug: '🐛', error: '⚠️', deadline: '⏰',
    };

    const label = this.add
      .text(GAME_WIDTH + 50, gapCenter - this.pipeGap / 2 - 20, emojiMap[obstacleType] || '📚', {
        fontSize: '24px',
      })
      .setOrigin(0.5)
      .setDepth(3);
    this.obstacleLabels.add(label);

    // Random power-up spawn
    if (Math.random() < this.config.powerUpChance) {
      this.spawnPowerUp(GAME_WIDTH + 50, gapCenter);
    }
  }

  spawnPowerUp(x, y) {
    const types = Object.keys(POWER_UPS);
    const type = Phaser.Utils.Array.GetRandom(types);

    const pu = this.powerUps.create(x, y + Phaser.Math.Between(-30, 30), `powerup_${type}`);
    pu.setData('type', type);
    pu.body.setSize(30, 30);
    pu.setDepth(4);

    // Floating animation
    this.tweens.add({
      targets: pu,
      y: pu.y + 10,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Emoji overlay
    const emoji = this.add
      .text(x, pu.y, POWER_UPS[type].emoji, { fontSize: '18px' })
      .setOrigin(0.5)
      .setDepth(5);
    pu.setData('emojiRef', emoji);
  }

  collectPowerUp(bird, powerUp) {
    const type = powerUp.getData('type');
    const emojiRef = powerUp.getData('emojiRef');
    if (emojiRef) emojiRef.destroy();
    powerUp.destroy();

    this.activatePowerUp(type);
    this.events.emit('powerUpCollected', { type, label: POWER_UPS[type].label });
  }

  activatePowerUp(type) {
    const cfg = POWER_UPS[type];

    switch (type) {
      case 'coffee':
        this.slowMotion = true;
        this.cameras.main.setBackgroundColor('#0a1520');
        this.time.delayedCall(cfg.duration, () => {
          this.slowMotion = false;
          this.cameras.main.setBackgroundColor('#0f1f33');
        });
        break;

      case 'shield':
        this.hasShield = true;
        this.shieldFx.setVisible(true);
        this.tweens.add({
          targets: this.shieldFx,
          alpha: { from: 0.8, to: 0.3 },
          duration: 600,
          yoyo: true,
          repeat: -1,
        });
        break;

      case 'double':
        this.scoreMultiplier = 2;
        this.time.delayedCall(cfg.duration, () => {
          this.scoreMultiplier = 1;
        });
        break;

      case 'wifi':
        // Clear nearby obstacles
        this.pipes.getChildren().forEach((pipe) => {
          if (pipe.x > this.bird.x - 50 && pipe.x < this.bird.x + 300) {
            this.tweens.add({
              targets: pipe,
              alpha: 0,
              scaleX: 0,
              duration: 200,
              onComplete: () => pipe.destroy(),
            });
          }
        });
        // Flash effect
        this.cameras.main.flash(200, 46, 204, 113, false);
        break;
    }
  }

  addScore(points) {
    const added = points * this.scoreMultiplier;
    this.score += added;
    this.events.emit('scoreUpdate', this.score);

  }

  updateJourneyBackground() {
    let newEra = 0;
    for (let i = JOURNEY_MILESTONES.length - 1; i >= 0; i--) {
      if (this.score >= JOURNEY_MILESTONES[i].score) {
        newEra = i;
        break;
      }
    }

    if (newEra !== this.currentEra) {
      this.currentEra = newEra;
      const milestone = JOURNEY_MILESTONES[newEra];

      this.tweens.add({
        targets: this.bg,
        alpha: 0,
        duration: 500,
        onComplete: () => {
          this.bg.setTexture(this.bgKeys[newEra]);
          this.tweens.add({ targets: this.bg, alpha: 1, duration: 500 });
        },
      });

      if (this.eraText) {
        this.eraText.setText(`✦ ${milestone.era} ✦`);
        this.cameras.main.flash(400, 255, 215, 0, false);
      }

      this.events.emit('eraChange', milestone);
    }
  }

  hitPipe(bird, pipe) {
    if (this.hasShield) {
      this.hasShield = false;
      this.shieldFx.setVisible(false);
      this.tweens.killTweensOf(this.shieldFx);
      this.cameras.main.flash(150, 52, 152, 219, false);
      pipe.destroy();
      return;
    }
    this.gameOver();
  }

  hitGround() {
    if (this.hasShield) {
      this.hasShield = false;
      this.shieldFx.setVisible(false);
      this.bird.setVelocityY(JUMP_VELOCITY);
      return;
    }
    this.gameOver();
  }

  gameOver() {
    if (this.isGameOver) return;
    this.isGameOver = true;

    this.bird.setTint(0xff0000);
    this.physics.pause();

    this.cameras.main.shake(300, 0.02);

    this.time.delayedCall(600, () => {
      this.scene.stop('UIScene');
      this.scene.start('GameOverScene', {
        score: this.score,
        mode: this.mode,
        player: this.player,
      });
    });
  }
}
