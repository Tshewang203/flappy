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
  SURPRISE_REWARD_CHANCE,
  ROLES,
  PLAYER_DISPLAY_SIZE,
  PLAYER_HIT_RADIUS,
  PLAYER_START_X,
  PIPE_WIDTH,
} from '../config/constants.js';
import { CAMPUS_LOCATIONS } from '../data/legacy.js';
import { getPlayer, getAvatar } from '../utils/storage.js';
import { buildFaceTexture } from '../utils/avatar.js';
import { loadOptionalImages } from '../utils/assets.js';
import { UIHelper } from '../utils/UIHelper.js';
import { AudioManager } from '../utils/audio.js';
import {
  shouldTriggerJourneyQuiz,
  shouldTriggerDeptQuiz,
  markJourneyQuizTriggered,
  getJourneyQuiz,
  getJourneyTimelineCard,
  getDeptQuestion,
  resetJourneyQuizState,
  resetDeptQuizState,
} from '../utils/quizEngine.js';

/**
 * GameScene — Core gameplay with quiz triggers and avatar support.
 */
export class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  init(data) {
    this.mode = data?.mode || 'flappy_cst';
    this.config = MODE_CONFIG[this.mode] || MODE_CONFIG.flappy_cst;
    this.modeInfo = Object.values(MODES).find((m) => m.id === this.mode) || MODES.FLAPPY_CST;
    this.player = getPlayer();
    this.score = 0;
    this.isGameOver = false;
    this.isStarted = false;
    this.isPaused = false;
    this.gameSpeed = this.config.initialSpeed;
    this.pipeGap = this.config.initialGap;
    this.pipeTimer = 0;
    this.obstaclesPassed = 0;
    this.lastQuizObstacle = 0;
    this.quizStreak = 0;
    this.intenseBgmStarted = false;

    resetJourneyQuizState();
    resetDeptQuizState();

    this.hasShield = false;
    this.scoreMultiplier = 1;
    this.slowMotion = false;

    this.currentEra = 0;
    this.bgTransitioning = false;
    this.bgKeys = ['bg_foundation', 'bg_growth', 'bg_expansion', 'bg_innovation', 'bg_jubilee'];
    this.campusKeys = ['campus1', 'campus2', 'campus3', 'campus4', 'campus5'];
    this.pipeKeys = ['pipe_silver', 'pipe_blue', 'pipe_purple', 'pipe_red'];
  }

  create() {
    this.physics.resume();
    this.scene.resume();

    ['UIScene', 'QuizScene', 'LegacyScene'].forEach((key) => {
      if (this.scene.isActive(key)) this.scene.stop(key);
    });

    UIHelper.setOpaqueBackground(this);
    this.cameras.main.fadeIn(300);
    loadOptionalImages(this);

    const initialBg = this.getBackgroundKey(0);
    this.bg = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, initialBg).setDepth(-2);
    this.fitBackground();

    if (this.mode === 'journey') {
      this.eraText = this.add.text(GAME_WIDTH / 2, 50, JOURNEY_MILESTONES[0].era, {
        fontFamily: 'Orbitron', fontSize: '13px', color: '#ffd700',
      }).setOrigin(0.5).setDepth(5).setAlpha(0.8);
    }

    this.campusLabel = this.add.text(GAME_WIDTH / 2, 72, '', {
      fontFamily: 'Inter', fontSize: '12px', color: 'rgba(255,255,255,0.6)',
    }).setOrigin(0.5).setDepth(5);

    this.pipes = this.physics.add.group();
    this.powerUps = this.physics.add.group();
    this.obstacleLabels = this.add.group();

    this.ground = this.add.tileSprite(GAME_WIDTH / 2, GAME_HEIGHT - 30, GAME_WIDTH, 60, 'ground').setDepth(10);

    this.groundBody = this.physics.add.staticGroup();
    const groundCollider = this.groundBody.create(GAME_WIDTH / 2, GAME_HEIGHT - 5, null);
    groundCollider.setSize(GAME_WIDTH, 10).setVisible(false);

    this.createPlayerSprite();

    this.shieldFx = this.add.image(this.bird.x, this.bird.y, 'shield_fx')
      .setDisplaySize(PLAYER_DISPLAY_SIZE + 20, PLAYER_DISPLAY_SIZE + 20)
      .setVisible(false).setDepth(6);

    this.physics.add.overlap(this.bird, this.pipes, this.hitPipe, null, this);
    this.physics.add.overlap(this.bird, this.powerUps, this.collectPowerUp, null, this);
    this.physics.add.collider(this.bird, this.groundBody, this.hitGround, null, this);

    this.scene.run('UIScene', { mode: this.mode, player: this.player });

    this._jumpHandler = () => this.handleJump();
    this.input.on('pointerdown', this._jumpHandler);
    this.input.keyboard?.on('keydown-SPACE', this._jumpHandler);

    const modeTag = this.modeInfo?.classic
      ? '🛩️ Classic Flappy — Just Fly'
      : this.mode === 'journey'
        ? '🏛️ CST trivia at 5, 15 & 25 pts'
        : `🎯 ${this.player?.department || 'Dept'} — surprise quizzes!`;
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 95, modeTag, {
      fontFamily: 'Inter', fontSize: '12px', color: 'rgba(255,255,255,0.55)',
    }).setOrigin(0.5).setDepth(20);

    this.readyText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 50, 'Tap or Press SPACE\nto Start', {
      fontFamily: 'Orbitron', fontSize: '20px', color: '#c0c0c0', align: 'center',
    }).setOrigin(0.5).setDepth(20);

    this.tweens.add({
      targets: this.readyText,
      alpha: { from: 1, to: 0.4 },
      duration: 800, yoyo: true, repeat: -1,
    });

    // Quiz completion handler
    this.events.on('quizComplete', ({ correct, bonus, speedPenalty, streakBonus, showTimeline, timelineIndex }) => {
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

      if (showTimeline && timelineIndex != null) {
        const card = getJourneyTimelineCard(timelineIndex);
        if (card) {
          this.triggerTimelineCard(card);
          return;
        }
      }

      this.isPaused = false;
      this.physics.resume();
    });

    this.events.on('legacyComplete', () => {
      this.isPaused = false;
      this.physics.resume();
    });

    this.events.once('shutdown', this.cleanupGameScene, this);
  }

  cleanupGameScene() {
    this.gameOverTimer?.remove(false);
    this.flapTween?.stop();
    this.tweens.killTweensOf(this.wingBack);
    this.tweens.killTweensOf(this.wingFront);
    this.wingBack?.destroy();
    this.wingFront?.destroy();
    if (this._jumpHandler) {
      this.input.off('pointerdown', this._jumpHandler);
      this.input.keyboard?.off('keydown-SPACE', this._jumpHandler);
    }
    ['UIScene', 'QuizScene', 'LegacyScene'].forEach((key) => {
      if (this.scene.isActive(key)) this.scene.stop(key);
    });
  }

  createFacePlayer(avatar) {
    const faceKey = 'player_face';
    if (this.textures.exists(faceKey)) this.textures.remove(faceKey);

    this.bird = this.physics.add.sprite(PLAYER_START_X, GAME_HEIGHT / 2, 'logo');
    this.bird.setDisplaySize(PLAYER_DISPLAY_SIZE, PLAYER_DISPLAY_SIZE);
    this.bird.body.setCircle(PLAYER_HIT_RADIUS);
    this.bird.body.setOffset(
      (PLAYER_DISPLAY_SIZE - PLAYER_HIT_RADIUS * 2) / 2,
      (PLAYER_DISPLAY_SIZE - PLAYER_HIT_RADIUS * 2) / 2
    );

    const wingW = Math.round(PLAYER_DISPLAY_SIZE * 0.42);
    const wingH = Math.round(PLAYER_DISPLAY_SIZE * 0.22);
    this.wingBack = this.add.image(this.bird.x - PLAYER_DISPLAY_SIZE * 0.55, this.bird.y + 2, 'wing')
      .setDisplaySize(wingW, wingH).setOrigin(1, 0.5).setDepth(4);
    this.wingFront = this.add.image(this.bird.x + PLAYER_DISPLAY_SIZE * 0.55, this.bird.y + 2, 'wing')
      .setDisplaySize(wingW, wingH).setOrigin(0, 0.5).setFlipX(true).setDepth(6);

    buildFaceTexture(this, avatar, faceKey)
      .then(() => {
        if (this.bird?.scene) {
          this.bird.setTexture(faceKey);
          this.bird.setDisplaySize(PLAYER_DISPLAY_SIZE, PLAYER_DISPLAY_SIZE);
        }
      })
      .catch(() => {
        this.textures.addBase64(faceKey, avatar);
        if (this.bird?.scene) {
          this.bird.setTexture(faceKey);
          this.bird.setDisplaySize(PLAYER_DISPLAY_SIZE, PLAYER_DISPLAY_SIZE);
        }
      });

    this.startWingFlap();
  }

  startWingFlap() {
    if (!this.wingBack || !this.wingFront) return;
    this.flapTween = this.tweens.add({
      targets: this.wingBack,
      angle: { from: 28, to: -32 },
      duration: 110,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    this.tweens.add({
      targets: this.wingFront,
      angle: { from: -28, to: 32 },
      duration: 110,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  syncWings() {
    if (!this.wingBack || !this.wingFront || !this.bird) return;
    const offset = PLAYER_DISPLAY_SIZE * 0.52;
    this.wingBack.setPosition(this.bird.x - offset, this.bird.y + 2);
    this.wingFront.setPosition(this.bird.x + offset, this.bird.y + 2);
  }

  createPlayerSprite() {
    const avatar = getAvatar();
    if (avatar) {
      this.createFacePlayer(avatar);
    } else {
      const styleMap = { student: 'bird', lecturer: 'avatar_lecturer', hacker: 'avatar_hacker' };
      const styleId = this.player?.avatarStyle || (this.player?.role === ROLES.LECTURER ? 'lecturer' : 'student');
      const texKey = this.textures.exists(styleMap[styleId]) ? styleMap[styleId] : 'bird';
      this.bird = this.physics.add.sprite(PLAYER_START_X, GAME_HEIGHT / 2, texKey);
      if (texKey === 'bird') {
        this.bird.body.setSize(32, 26);
        this.bird.body.setOffset(6, 5);
      } else {
        this.bird.setDisplaySize(PLAYER_DISPLAY_SIZE, PLAYER_DISPLAY_SIZE);
        this.bird.body.setCircle(PLAYER_HIT_RADIUS);
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

  fitBackground() {
    if (!this.bg) return;
    this.bg.setDisplaySize(GAME_WIDTH, GAME_HEIGHT);
    this.bg.setPosition(GAME_WIDTH / 2, GAME_HEIGHT / 2);
  }

  transitionBackground(newEra, options = {}) {
    const milestone = JOURNEY_MILESTONES[newEra] || JOURNEY_MILESTONES[0];
    const newBg = this.getBackgroundKey(newEra);
    if (this.bgTransitioning || this.bg.texture.key === newBg) {
      this.currentEra = newEra;
      return;
    }

    this.bgTransitioning = true;
    this.currentEra = newEra;

    this.tweens.add({
      targets: this.bg,
      alpha: 0,
      duration: 450,
      onComplete: () => {
        this.bg.setTexture(newBg);
        this.fitBackground();
        this.tweens.add({
          targets: this.bg,
          alpha: 1,
          duration: 450,
          onComplete: () => { this.bgTransitioning = false; },
        });
      },
    });

    if (options.updateEraText && this.eraText) {
      this.eraText.setText(`✦ ${milestone.era} ✦`);
      this.cameras.main.flash(400, 255, 215, 0, false);
    }

    const loc = CAMPUS_LOCATIONS[milestone.campusKey];
    if (loc && this.campusLabel) this.campusLabel.setText(`📍 ${loc}`);

    if (options.emitEraChange) {
      this.events.emit('eraChange', milestone);
    }
  }

  handleJump() {
    if (this.isGameOver || this.isPaused) return;

    // First tap/press should both START the game and JUMP.
    if (!this.isStarted) {
      this.startGame();
    }

    this.bird.setVelocityY(JUMP_VELOCITY);
    AudioManager.play(this, 'jump');
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
    if (this.wingBack) this.syncWings();
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
      const cap = pipe.getData('cap');
      if (cap) cap.x = pipe.x;
      if (!pipe.getData('scored') && pipe.getData('isMarker') && pipe.x + PIPE_WIDTH / 2 < this.bird.x) {
        pipe.setData('scored', true);
        this.onObstaclePassed();
      }
      if (pipe.x < -100) {
        cap?.destroy();
        pipe.destroy();
      }
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

    if (this.score >= 50 && !this.intenseBgmStarted) {
      this.intenseBgmStarted = true;
      AudioManager.playBGM(this, true);
    }

    this.updateCampusBackground();
    if (this.mode === 'journey') this.updateJourneyBackground();
  }

  updateCampusBackground() {
    if (this.mode === 'journey' || this.modeInfo?.classic) return;

    let era = 0;
    for (let i = JOURNEY_MILESTONES.length - 1; i >= 0; i--) {
      if (this.score >= JOURNEY_MILESTONES[i].score) { era = i; break; }
    }

    if (era !== this.currentEra) {
      this.transitionBackground(era);
      return;
    }

    if (!this.bgTransitioning) {
      const preferredBg = this.getBackgroundKey(era);
      if (preferredBg !== this.bg.texture.key) {
        this.transitionBackground(era);
      }
    }
  }

  triggerTimelineCard(card) {
    this.isPaused = true;
    this.physics.pause();
    this.scene.launch('LegacyScene', { moment: card, isTimeline: true });
    this.scene.pause();
  }


  onObstaclePassed() {
    this.obstaclesPassed++;
    this.addScore(1);
    AudioManager.play(this, 'point', { volume: 0.35 });

    if (this.obstaclesPassed > 0 && this.obstaclesPassed % 5 === 0) {
      this.gameSpeed = Math.min(this.config.maxSpeed, this.config.initialSpeed + this.obstaclesPassed * 2);
      this.pipeGap = Math.max(this.config.minGap, this.config.initialGap - this.obstaclesPassed * 0.8);
    }

    if (!this.modeInfo?.classic && Math.random() < SURPRISE_REWARD_CHANCE) {
      this.triggerSurpriseReward();
    }

    if (!this.modeInfo?.hasQuiz || this.isPaused) return;

    if (this.mode === 'journey' && shouldTriggerJourneyQuiz(this.score)) {
      markJourneyQuizTriggered(this.score);
      this.lastQuizObstacle = this.obstaclesPassed;
      this.triggerQuiz(this.score);
      return;
    }

    if (
      this.mode === 'department' &&
      shouldTriggerDeptQuiz(this.score, this.obstaclesPassed, this.lastQuizObstacle)
    ) {
      this.lastQuizObstacle = this.obstaclesPassed;
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

  triggerQuiz(triggerScore = null) {
    this.isPaused = true;
    this.physics.pause();

    let question = null;
    let timelineIndex = null;
    let difficulty = 'easy';
    let quizCategory = 'department';
    const department = this.player?.department || 'IT';

    if (this.mode === 'journey' && triggerScore != null) {
      const journeyData = getJourneyQuiz(triggerScore);
      if (!journeyData) {
        this.isPaused = false;
        this.physics.resume();
        return;
      }
      question = journeyData.question;
      timelineIndex = journeyData.quizIndex;
      quizCategory = 'CST';
      difficulty = 'history';
    } else if (this.mode === 'department') {
      const deptData = getDeptQuestion(department, this.score);
      if (!deptData) {
        this.isPaused = false;
        this.physics.resume();
        return;
      }
      question = deptData.question;
      difficulty = deptData.difficulty;
      quizCategory = 'department';
    } else {
      this.isPaused = false;
      this.physics.resume();
      return;
    }

    this.scene.launch('QuizScene', {
      mode: this.mode,
      quizCategory,
      department,
      score: this.score,
      obstacleCount: this.obstaclesPassed,
      quizStreak: this.quizStreak,
      question,
      difficulty,
      timelineIndex,
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
    topPipe.setDisplaySize(PIPE_WIDTH, topH);
    topPipe.body.setSize(PIPE_WIDTH - 10, topH);
    topPipe.setDepth(2);
    topPipe.setFlipY(true);
    const topCap = this.add.image(GAME_WIDTH + 50, topH, 'pipe_cap')
      .setDisplaySize(PIPE_WIDTH + 8, 34).setDepth(3).setFlipY(true);
    topPipe.setData('cap', topCap);

    const bottomY = gapCenter + this.pipeGap / 2;
    const bottomH = GAME_HEIGHT - bottomY - 60;
    const bottomPipe = this.pipes.create(GAME_WIDTH + 50, bottomY + bottomH / 2, pipeKey);
    bottomPipe.setDisplaySize(PIPE_WIDTH, bottomH);
    bottomPipe.body.setSize(PIPE_WIDTH - 10, bottomH);
    bottomPipe.setDepth(2);
    bottomPipe.setData('isMarker', true);
    bottomPipe.setData('scored', false);
    const bottomCap = this.add.image(GAME_WIDTH + 50, bottomY, 'pipe_cap')
      .setDisplaySize(PIPE_WIDTH + 8, 34).setDepth(3);
    bottomPipe.setData('cap', bottomCap);

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
            const cap = pipe.getData('cap');
            this.tweens.add({
              targets: pipe,
              alpha: 0,
              scaleX: 0,
              duration: 200,
              onComplete: () => {
                cap?.destroy();
                pipe.destroy();
              },
            });
            if (cap) {
              this.tweens.add({ targets: cap, alpha: 0, scaleX: 0, duration: 200 });
            }
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
      this.transitionBackground(newEra, { updateEraText: true, emitEraChange: true });
      return;
    }

    if (!this.bgTransitioning) {
      const preferredBg = this.getBackgroundKey(newEra);
      if (preferredBg !== this.bg.texture.key) {
        this.transitionBackground(newEra, { updateEraText: false, emitEraChange: false });
      }
    }
  }

  hitPipe(bird, pipe) {
    if (this.hasShield) {
      this.hasShield = false;
      this.shieldFx.setVisible(false);
      this.tweens.killTweensOf(this.shieldFx);
      pipe.getData('cap')?.destroy();
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
    if (this.bird?.setTint) this.bird.setTint(0xff0000);
    this.physics.pause();
    this.cameras.main.shake(300, 0.02);

    this.gameOverTimer = this.time.delayedCall(600, () => {
      if (!this.scene.isActive('GameScene')) return;
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
