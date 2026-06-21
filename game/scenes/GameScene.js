import {
  GAME_WIDTH,
  GAME_HEIGHT,
  MODE_CONFIG,
  JOURNEY_MILESTONES,
  MODES,
  GRAVITY,
  JUMP_VELOCITY,
  MAX_FALL_SPEED,
  POWER_UPS,
  QUIZ_INTERVAL,
  SURPRISE_REWARD_CHANCE,
  ROLES,
} from '../config/constants.js';
import { LEGACY_MOMENTS, CAMPUS_LOCATIONS } from '../data/legacy.js';
import { getPlayer, getAvatar } from '../utils/storage.js';
import { UIHelper } from '../utils/UIHelper.js';
import { AudioManager } from '../utils/audio.js';

/**
 * GameScene — Core gameplay with quiz triggers and avatar support.
 */
export class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  init(data) {
    this.mode = data.mode || 'flappy_cst';
    this.config = MODE_CONFIG[this.mode];
    this.modeInfo = Object.values(MODES).find((m) => m.id === this.mode);
    this.player = getPlayer();
    this.score = 0;
    this.isGameOver = false;
    this.isStarted = false;
    this.isPaused = false;
    this.gameSpeed = this.config.initialSpeed;
    this.pipeGap = this.config.initialGap;
    this.pipeTimer = 0;
    this.scoreTimer = 0;
    this.obstaclesPassed = 0;
    this.lastQuizAt = 0;
    this.quizStreak = 0;
    this.legacyTriggered = false;
    this.legacyShown = [];
    this.intenseBgmStarted = false;

    this.hasShield = false;
    this.scoreMultiplier = 1;
    this.slowMotion = false;

    this.currentEra = 0;
    this.bgKeys = ['bg_foundation', 'bg_growth', 'bg_expansion', 'bg_innovation', 'bg_jubilee'];
    this.campusKeys = ['campus1', 'campus2', 'campus3', 'campus4', 'campus5'];
    this.pipeKeys = ['pipe_silver', 'pipe_blue', 'pipe_purple', 'pipe_red'];
  }

  create() {
    UIHelper.setOpaqueBackground(this);
    this.cameras.main.fadeIn(300);

    const initialBg = this.getBackgroundKey(0);
    this.bg = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, initialBg).setDepth(-2);

    if (this.mode === 'journey') {
      this.eraText = this.add.text(GAME_WIDTH / 2, 50, JOURNEY_MILESTONES[0].era, {
        fontFamily: 'Orbitron', fontSize: '13px', color: '#ffd700',
      }).setOrigin(0.5).setDepth(5).setAlpha(0.8);
    }

    this.campusLabel = this.add.text(GAME_WIDTH / 2, 72, '', {
      fontFamily: 'Inter', fontSize: '10px', color: 'rgba(255,255,255,0.6)',
    }).setOrigin(0.5).setDepth(5);

    this.pipes = this.physics.add.group();
    this.powerUps = this.physics.add.group();
    this.obstacleLabels = this.add.group();

    this.ground = this.add.tileSprite(GAME_WIDTH / 2, GAME_HEIGHT - 30, GAME_WIDTH, 60, 'ground').setDepth(10);

    this.groundBody = this.physics.add.staticGroup();
    const groundCollider = this.groundBody.create(GAME_WIDTH / 2, GAME_HEIGHT - 5, null);
    groundCollider.setSize(GAME_WIDTH, 10).setVisible(false);

    this.createPlayerSprite();

    this.shieldFx = this.add.image(this.bird.x, this.bird.y, 'shield_fx').setVisible(false).setDepth(6);

    this.physics.add.overlap(this.bird, this.pipes, this.hitPipe, null, this);
    this.physics.add.overlap(this.bird, this.powerUps, this.collectPowerUp, null, this);
    this.physics.add.collider(this.bird, this.groundBody, this.hitGround, null, this);

    this.scene.launch('UIScene', { mode: this.mode, player: this.player });

    this.input.on('pointerdown', () => this.handleJump());
    this.input.keyboard.on('keydown-SPACE', () => this.handleJump());

    this.readyText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 50, 'Tap or Press SPACE\nto Start', {
      fontFamily: 'Orbitron', fontSize: '20px', color: '#c0c0c0', align: 'center',
    }).setOrigin(0.5).setDepth(20);

    this.tweens.add({
      targets: this.readyText,
      alpha: { from: 1, to: 0.4 },
      duration: 800, yoyo: true, repeat: -1,
    });

    // Quiz completion handler
    this.events.on('quizComplete', ({ correct, bonus, speedPenalty, streakBonus }) => {
      this.isPaused = false;
      if (correct) {
        this.quizStreak++;
        this.addScore(bonus + (streakBonus || 0));
        this.cameras.main.flash(200, 46, 204, 113, false);
        AudioManager.play(this, 'correct');
      } else {
        this.quizStreak = 0;
        this.score = Math.max(0, this.score + bonus);
        this.events.emit('scoreUpdate', this.score);
        if (speedPenalty) {
          this.gameSpeed = Math.min(this.config.maxSpeed, this.gameSpeed + 30);
        }
        this.cameras.main.flash(200, 231, 76, 60, false);
        AudioManager.play(this, 'wrong');
      }
      this.physics.resume();
    });

    this.events.on('legacyComplete', () => {
      this.isPaused = false;
      this.physics.resume();
    });
  }

  createPlayerSprite() {
    const avatar = getAvatar();
    if (avatar) {
      const key = 'player_avatar';
      if (this.textures.exists(key)) this.textures.remove(key);
      this.textures.addBase64(key, avatar);
      this.bird = this.physics.add.sprite(100, GAME_HEIGHT / 2, key);
      this.bird.setDisplaySize(52, 52);
      this.bird.body.setCircle(22);
      this.bird.body.setOffset(4, 4);
    } else {
      const styleMap = { student: 'bird', lecturer: 'avatar_lecturer', hacker: 'avatar_hacker' };
      const styleId = this.player?.avatarStyle || (this.player?.role === ROLES.LECTURER ? 'lecturer' : 'student');
      const texKey = this.textures.exists(styleMap[styleId]) ? styleMap[styleId] : 'bird';
      this.bird = this.physics.add.sprite(100, GAME_HEIGHT / 2, texKey);
      if (texKey === 'bird') {
        this.bird.body.setSize(32, 26);
        this.bird.body.setOffset(6, 5);
      } else {
        this.bird.setDisplaySize(48, 48);
        this.bird.body.setCircle(20);
      }
    }

    this.bird.setCollideWorldBounds(true);
    this.bird.setDepth(5);
    this.bird.setGravityY(0);
  }

  getBackgroundKey(eraIndex) {
    const milestone = JOURNEY_MILESTONES[eraIndex] || JOURNEY_MILESTONES[0];
    const campusKey = milestone.campusKey;
    if (this.textures.exists(campusKey)) return campusKey;
    return milestone.bgKey || this.bgKeys[eraIndex] || 'bg_foundation';
  }

  handleJump() {
    if (this.isGameOver || this.isPaused) return;
    if (!this.isStarted) { this.startGame(); return; }

    this.bird.setVelocityY(JUMP_VELOCITY);
    AudioManager.play(this, 'jump');
    this.tweens.add({
      targets: this.bird, angle: -20, duration: 100,
      onComplete: () => {
        this.tweens.add({ targets: this.bird, angle: { from: -20, to: 45 }, duration: 500 });
      },
    });
  }

  startGame() {
    this.isStarted = true;
    this.bird.setGravityY(GRAVITY);
    this.readyText.destroy();
    this.events.emit('gameStarted');
    AudioManager.playBGM(this, false);
  }

  update(time, delta) {
    if (this.isGameOver || this.isPaused) return;

    const dt = this.slowMotion ? delta * 0.5 : delta;
    const dtScale = dt / 16.67;

    if (this.bird.body.velocity.y > MAX_FALL_SPEED) {
      this.bird.setVelocityY(MAX_FALL_SPEED);
    }

    if (this.hasShield) this.shieldFx.setPosition(this.bird.x, this.bird.y);
    if (!this.isStarted) return;

    this.ground.tilePositionX += this.gameSpeed * 0.02 * dtScale;

    this.pipeTimer += dt;
    const spawnRate = this.slowMotion ? this.config.spawnInterval * 1.5 : this.config.spawnInterval;
    if (this.pipeTimer >= spawnRate) {
      this.pipeTimer = 0;
      this.spawnPipePair();
    }

    const speed = this.gameSpeed * dtScale * 0.06;

    this.pipes.getChildren().forEach((pipe) => {
      pipe.x -= speed;
      if (!pipe.getData('scored') && pipe.getData('isMarker') && pipe.x + 40 < this.bird.x) {
        pipe.setData('scored', true);
        this.onObstaclePassed();
      }
      if (pipe.x < -100) pipe.destroy();
    });

    this.powerUps.getChildren().forEach((pu) => {
      pu.x -= speed;
      const emojiRef = pu.getData('emojiRef');
      if (emojiRef) emojiRef.x = pu.x;
      if (pu.x < -50) {
        if (emojiRef) emojiRef.destroy();
        pu.destroy();
      }
    });

    this.obstacleLabels.getChildren().forEach((label) => {
      label.x -= speed;
      if (label.x < -50) label.destroy();
    });

    this.scoreTimer += dt;
    if (this.scoreTimer >= 500) {
      this.scoreTimer = 0;
      this.addScore(1);
    }

    if (this.score > 0 && this.score % 5 === 0) {
      this.gameSpeed = Math.min(this.config.maxSpeed, this.config.initialSpeed + this.score * 2);
      this.pipeGap = Math.max(this.config.minGap, this.config.initialGap - this.score * 0.8);
    }

    if (this.score >= 50 && !this.intenseBgmStarted) {
      this.intenseBgmStarted = true;
      AudioManager.playBGM(this, true);
    }

    this.updateCampusBackground();
    if (this.mode === 'journey') this.updateJourneyBackground();
    this.checkLegacyMoments();
  }

  updateCampusBackground() {
    let era = 0;
    for (let i = JOURNEY_MILESTONES.length - 1; i >= 0; i--) {
      if (this.score >= JOURNEY_MILESTONES[i].score) { era = i; break; }
    }
    if (era !== this.currentEra && this.mode !== 'journey') {
      this.currentEra = era;
      const newBg = this.getBackgroundKey(era);
      this.bg.setTexture(newBg);
      const loc = CAMPUS_LOCATIONS[JOURNEY_MILESTONES[era].campusKey];
      if (loc && this.campusLabel) this.campusLabel.setText(`📍 ${loc}`);
    }
  }

  checkLegacyMoments() {
    if (this.isPaused || this.isGameOver) return;
    LEGACY_MOMENTS.forEach((moment) => {
      if (this.score >= moment.score && !this.legacyShown.includes(moment.score)) {
        this.legacyShown.push(moment.score);
        this.legacyTriggered = true;
        this.triggerLegacy(moment);
      }
    });
  }

  triggerLegacy(moment) {
    this.isPaused = true;
    this.physics.pause();
    this.scene.launch('LegacyScene', { moment });
    this.scene.pause();
  }

  onObstaclePassed() {
    this.obstaclesPassed++;
    AudioManager.play(this, 'point', { volume: 0.35 });

    if (Math.random() < SURPRISE_REWARD_CHANCE) {
      this.triggerSurpriseReward();
    }

    if (
      this.modeInfo?.hasQuiz &&
      this.obstaclesPassed > 0 &&
      this.obstaclesPassed % QUIZ_INTERVAL === 0 &&
      this.lastQuizAt !== this.obstaclesPassed
    ) {
      this.lastQuizAt = this.obstaclesPassed;
      this.triggerQuiz();
    }
  }

  triggerSurpriseReward() {
    const rewards = [
      { label: '🎉 Lucky Shield!', action: () => { this.hasShield = true; this.shieldFx.setVisible(true); } },
      { label: '🎓 Faculty Bonus!', action: () => { this.scoreMultiplier = 2; this.time.delayedCall(5000, () => { this.scoreMultiplier = 1; }); } },
      { label: '⚡ Speed Surge!', action: () => { this.gameSpeed = Math.min(this.config.maxSpeed, this.gameSpeed + 40); } },
    ];
    const reward = Phaser.Utils.Array.GetRandom(rewards);
    reward.action();
    this.events.emit('powerUpCollected', { type: 'surprise', label: reward.label });
    AudioManager.play(this, 'powerup');
  }

  triggerQuiz() {
    this.isPaused = true;
    this.physics.pause();

    const quizCategory = this.mode === 'journey' ? 'CST' : this.player?.department || 'IT';

    this.scene.launch('QuizScene', {
      quizCategory: this.mode === 'journey' ? 'CST' : 'department',
      department: this.player?.department || 'IT',
      obstacleCount: this.obstaclesPassed,
      quizStreak: this.quizStreak,
    });
    this.scene.pause();
  }

  spawnPipePair() {
    const minY = 120;
    const maxY = GAME_HEIGHT - 120 - this.pipeGap;
    const gapCenter = Phaser.Math.Between(minY + this.pipeGap / 2, maxY);

    const pipeKey = this.pipeKeys[Math.min(this.currentEra, this.pipeKeys.length - 1)];
    const obstacleType = Phaser.Utils.Array.GetRandom(this.config.obstacles);

    const topH = gapCenter - this.pipeGap / 2;
    const topPipe = this.pipes.create(GAME_WIDTH + 50, topH / 2, pipeKey);
    topPipe.setDisplaySize(80, topH);
    topPipe.body.setSize(70, topH);
    topPipe.setDepth(2);
    topPipe.setFlipY(true);

    const bottomY = gapCenter + this.pipeGap / 2;
    const bottomH = GAME_HEIGHT - bottomY - 60;
    const bottomPipe = this.pipes.create(GAME_WIDTH + 50, bottomY + bottomH / 2, pipeKey);
    bottomPipe.setDisplaySize(80, bottomH);
    bottomPipe.body.setSize(70, bottomH);
    bottomPipe.setDepth(2);
    bottomPipe.setData('isMarker', true);
    bottomPipe.setData('scored', false);

    const emojiMap = { book: '📚', exam: '📝', assignment: '📋' };
    const label = this.add.text(GAME_WIDTH + 50, gapCenter - this.pipeGap / 2 - 20, emojiMap[obstacleType] || '📚', {
      fontSize: '24px',
    }).setOrigin(0.5).setDepth(3);
    this.obstacleLabels.add(label);

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

    this.tweens.add({
      targets: pu, y: pu.y + 10, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    const emoji = this.add.text(x, pu.y, POWER_UPS[type].emoji, { fontSize: '18px' })
      .setOrigin(0.5).setDepth(5);
    pu.setData('emojiRef', emoji);
  }

  collectPowerUp(bird, powerUp) {
    const type = powerUp.getData('type');
    const emojiRef = powerUp.getData('emojiRef');
    if (emojiRef) emojiRef.destroy();
    powerUp.destroy();
    AudioManager.play(this, 'powerup');
    this.activatePowerUp(type);
    this.events.emit('powerUpCollected', { type, label: POWER_UPS[type].label });
  }

  activatePowerUp(type) {
    const cfg = POWER_UPS[type];
    switch (type) {
      case 'coffee':
        this.slowMotion = true;
        this.time.delayedCall(cfg.duration, () => { this.slowMotion = false; });
        break;
      case 'shield':
        this.hasShield = true;
        this.shieldFx.setVisible(true);
        this.tweens.add({ targets: this.shieldFx, alpha: { from: 0.8, to: 0.3 }, duration: 600, yoyo: true, repeat: -1 });
        break;
      case 'double':
        this.scoreMultiplier = 2;
        this.time.delayedCall(cfg.duration, () => { this.scoreMultiplier = 1; });
        break;
      case 'wifi':
        this.pipes.getChildren().forEach((pipe) => {
          if (pipe.x > this.bird.x - 50 && pipe.x < this.bird.x + 300) {
            this.tweens.add({ targets: pipe, alpha: 0, scaleX: 0, duration: 200, onComplete: () => pipe.destroy() });
          }
        });
        this.cameras.main.flash(200, 46, 204, 113, false);
        break;
    }
  }

  addScore(points) {
    this.score += points * this.scoreMultiplier;
    this.events.emit('scoreUpdate', this.score);
  }

  updateJourneyBackground() {
    let newEra = 0;
    for (let i = JOURNEY_MILESTONES.length - 1; i >= 0; i--) {
      if (this.score >= JOURNEY_MILESTONES[i].score) { newEra = i; break; }
    }

    if (newEra !== this.currentEra) {
      this.currentEra = newEra;
      const milestone = JOURNEY_MILESTONES[newEra];
      const newBg = this.getBackgroundKey(newEra);

      this.tweens.add({
        targets: this.bg, alpha: 0, duration: 500,
        onComplete: () => {
          this.bg.setTexture(newBg);
          this.tweens.add({ targets: this.bg, alpha: 1, duration: 500 });
        },
      });

      if (this.eraText) {
        this.eraText.setText(`✦ ${milestone.era} ✦`);
        this.cameras.main.flash(400, 255, 215, 0, false);
      }
      const loc = CAMPUS_LOCATIONS[milestone.campusKey];
      if (loc && this.campusLabel) this.campusLabel.setText(`📍 ${loc}`);
      this.events.emit('eraChange', milestone);
    }
  }

  hitPipe(bird, pipe) {
    if (this.hasShield) {
      this.hasShield = false;
      this.shieldFx.setVisible(false);
      this.tweens.killTweensOf(this.shieldFx);
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
    AudioManager.play(this, 'hit');
    AudioManager.play(this, 'gameover', { volume: 0.5 });
    AudioManager.stopBGM(this);
    this.bird.setTint(0xff0000);
    this.physics.pause();
    this.cameras.main.shake(300, 0.02);

    this.time.delayedCall(600, () => {
      this.scene.stop('UIScene');
      this.scene.stop('QuizScene');
      this.scene.stop('LegacyScene');
      this.scene.start('GameOverScene', {
        score: this.score,
        mode: this.mode,
        player: this.player,
        quizStreak: this.quizStreak,
        legacyTriggered: this.legacyTriggered,
      });
    });
  }
}
