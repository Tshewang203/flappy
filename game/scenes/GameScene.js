import {
  GAME_WIDTH,
  GAME_HEIGHT,
  MODE_CONFIG,
  JOURNEY_MILESTONES,
  STORY_LEVELS,
  MODES,
  GRAVITY,
  JUMP_VELOCITY,
  MAX_FALL_SPEED,
  POWER_UPS,
  JUBILEE_POWER_UPS,
  POWER_UP_VISUALS,
  POWER_UP_DISPLAY_SIZE,
  SPEED_BOOST_MULTIPLIER,
  SURPRISE_REWARD_CHANCE,
  PLAYER_DISPLAY_SIZE,
  PLAYER_HIT_RADIUS,
  PLAYER_START_X,
  PIPE_SPACING,
  PIPE_SPACING_JITTER,
  PIPE_MIN_WIDTH,
  PIPE_MAX_WIDTH,
  WALL_LEVEL_SCORE,
  WALL_MOTION_LEVEL,
  WALL_PALETTES,
  COLORS,
} from '../config/constants.js';
import { WING_TEX_W, WING_ROOT, WALL_TEX_W } from './BootScene.js';

/** Displayed height of the wall lip */
const WALL_CAP_H = 34;
/** Extra wall length hidden off-screen / under the ground */
const WALL_OVERSHOOT = 60;
/** Max vertical jump between consecutive gap centres */
const MAX_GAP_SHIFT = 280;
import { CAMPUS_LOCATIONS } from '../data/legacy.js';
import { getPlayer, getAvatar } from '../utils/storage.js';
import { buildFaceTexture } from '../utils/avatar.js';
import { loadOptionalImages, areImagesSettled, whenImagesSettled } from '../utils/assets.js';
import { UIHelper } from '../utils/UIHelper.js';
import { AudioManager } from '../utils/audio.js';
import {
  getJubileeQuiz,
  getJourneyTimelineCard,
  getDeptQuestion,
  getDifficultyForProgress,
  getNextDeptQuizCheckpoint,
  getYearKey,
  resetQuizState,
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
    this.quizStreak = 0;
    this.intenseBgmStarted = false;
    /** Silver Jubilee Challenge: stages with quiz checkpoints (formerly Story + Journey) */
    this.isJubilee = Boolean(this.modeInfo?.stages);

    // Fresh random question order for every game
    resetQuizState();
    /** Department Challenge: quizzes asked so far and the wall count that triggers the next one */
    this.deptQuizCount = 0;
    this.nextDeptQuizAt = getNextDeptQuizCheckpoint(0, 0);
    /** Question-bank year for this player (1st–4th; 5th year, alumni and lecturers use year 4) */
    this.yearKey = getYearKey(this.player);

    this.hasShield = false;
    this.scoreMultiplier = 1;
    this.slowMotion = false;
    this.speedBoost = false;
    /** Running timers for Jubilee power-up effects, keyed by type (re-collecting refreshes) */
    this.effectTimers = {};
    /** Jubilee: between stages (walls cleared, scenery changing, waiting for the tap prompt) */
    this.stageTransitioning = false;

    this.currentEra = 0;
    this.bgTransitioning = false;
    this.bgKeys = ['bg_foundation', 'bg_growth', 'bg_expansion', 'bg_innovation', 'bg_jubilee'];
    this.campusKeys = ['campus1', 'campus2', 'campus3', 'campus4', 'campus5'];
    this.wallLevel = 1;
    this.lastGapCenter = null;
    this.wings = [];

    this.storyLevel = 1;
    this.storyTotalScore = 0;
    this.storyAdvancing = false;
    /** True from the moment a stage checkpoint quiz opens until the stage advances or it's failed */
    this.checkpointActive = false;
    /** True while a (non-gating) mid-stage Jubilee quiz is open */
    this.midQuizActive = false;
    /** Mid-stage quiz scores already asked in the current stage */
    this.midQuizzesDone = new Set();
    this.pendingStageAdvance = false;
    if (this.isJubilee) {
      this.applyStoryLevelSettings();
    }
  }

  create() {
    // Silver Jubilee (every stage) and Classic (its one scenery): the images must be loaded before
    // play starts. Otherwise, on a slow connection, the game opens on the fallback night sky.
    this.waitingForScenery = false;
    const sceneryKeys = this.isJubilee
      ? STORY_LEVELS.map((level) => level.bgKey)
      : this.modeInfo?.classic ? ['classic_bg'] : [];
    if (sceneryKeys.length) {
      loadOptionalImages(this);
      if (!areImagesSettled(sceneryKeys)) {
        this.waitingForScenery = true;
        this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'Loading...', {
          fontFamily: 'Orbitron', fontSize: '18px', color: COLORS.silver,
        }).setOrigin(0.5);
        whenImagesSettled(sceneryKeys).then(() => {
          if (this.sys.isActive()) this.scene.restart({ mode: this.mode });
        });
        return;
      }
    }

    this.physics.resume();
    this.scene.resume();

    ['UIScene', 'QuizScene', 'LegacyScene'].forEach((key) => {
      if (this.scene.isActive(key)) this.scene.stop(key);
    });

    UIHelper.setOpaqueBackground(this);
    this.cameras.main.fadeIn(300);
    loadOptionalImages(this);

    const initialBg = this.isJubilee
      ? this.getStoryBackgroundKey()
      : this.modeInfo?.classic && this.textures.exists('classic_bg') ? 'classic_bg' : this.getBackgroundKey(0);
    this.bg = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, initialBg).setDepth(-2);
    this.fitBackground();

    this.campusLabel = this.add.text(GAME_WIDTH / 2, 72, '', {
      fontFamily: 'Inter', fontSize: '12px', color: 'rgba(255,255,255,0.6)',
    }).setOrigin(0.5).setDepth(5);

    this.pipes = this.physics.add.group({ allowGravity: false, immovable: true });
    this.powerUps = this.physics.add.group({ allowGravity: false });

    this.ground = this.add.tileSprite(GAME_WIDTH / 2, GAME_HEIGHT - 30, GAME_WIDTH, 60, 'ground').setDepth(10);

    this.groundBody = this.physics.add.staticGroup();
    const groundCollider = this.groundBody.create(GAME_WIDTH / 2, GAME_HEIGHT - 5, null);
    groundCollider.setSize(GAME_WIDTH, 10).setVisible(false);

    this.createPlayerSprite();

    const shieldSize = PLAYER_DISPLAY_SIZE + 34;
    this.shieldFx = this.add.image(this.bird.x, this.bird.y, 'shield_bubble')
      .setDisplaySize(shieldSize, shieldSize)
      .setVisible(false).setDepth(6);
    this.shieldBaseScale = this.shieldFx.scaleX;

    this.physics.add.overlap(this.bird, this.pipes, this.hitPipe, null, this);
    this.physics.add.overlap(this.bird, this.powerUps, this.collectPowerUp, null, this);
    this.physics.add.collider(this.bird, this.groundBody, this.hitGround, null, this);

    this.scene.run('UIScene', { mode: this.mode, player: this.player });

    this._jumpHandler = () => this.handleJump();
    this.input.on('pointerdown', this._jumpHandler);
    this.input.keyboard?.on('keydown-SPACE', this._jumpHandler);

    const modeTag = this.modeInfo?.classic
      ? 'Classic Flappy — Just Fly'
      : this.isJubilee
        ? 'Reach the target, pass the CST quiz checkpoint to unlock the next scene'
        : `${this.player?.department || 'Dept'} quizzes get harder as you fly`;
    const modeTagText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 95, modeTag, {
      fontFamily: 'Inter', fontSize: '12px', color: 'rgba(255,255,255,0.9)',
    }).setOrigin(0.5).setDepth(20);
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT - 95, modeTagText.width + 32, 26, 0x0a1e33, 0.6)
      .setDepth(19);

    this.readyBadge = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 50, 360, 74, 0x0a1e33, 0.7)
      .setStrokeStyle(2, COLORS.gold, 0.6).setDepth(19);
    this.readyText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 50, 'Tap or Press SPACE\nto Start', {
      fontFamily: 'Orbitron', fontSize: '20px', color: COLORS.gold, align: 'center',
    }).setOrigin(0.5).setDepth(20);

    this.tweens.add({
      targets: this.readyText,
      alpha: { from: 1, to: 0.4 },
      duration: 800, yoyo: true, repeat: -1,
    });

    // Scene event emitters survive restarts, so these are removed again in cleanupGameScene
    // (otherwise every replay adds another copy and one quiz answer is applied N times).
    this.events.on('quizComplete', this.onQuizComplete, this);
    this.events.on('legacyComplete', this.onLegacyComplete, this);

    this.events.once('shutdown', this.cleanupGameScene, this);
  }

  onQuizComplete({ correct, bonus, speedPenalty, streakBonus, showTimeline, timelineIndex }) {
    // A mid-stage quiz only changes the score; it never gates progress. Keep the flag set while
    // scoring so the bonus can't immediately open another quiz, and clear it afterwards.
    const wasMidQuiz = this.midQuizActive;
    if (correct) {
      this.quizStreak++;
      this.addScore(bonus + (streakBonus || 0));
      this.cameras.main.flash(200, 46, 204, 113, false);
      AudioManager.play(this, 'correct');
    } else {
      this.quizStreak = 0;
      // QuizScene sends -QUIZ_PENALTY, which is +3 since QUIZ_PENALTY is already negative.
      // A checkpoint miss must lower the score so the player has to earn the retry,
      // so the Jubilee path forces a real deduction. (Department keeps its existing behaviour.)
      const delta = this.isJubilee ? -Math.abs(bonus) : bonus;
      const newScore = Math.max(0, this.score + delta);
      if (this.isJubilee) this.storyTotalScore = Math.max(0, this.storyTotalScore - (this.score - newScore));
      this.score = newScore;
      this.events.emit('scoreUpdate', this.score);
      if (speedPenalty) {
        this.gameSpeed = Math.min(this.config.maxSpeed, this.gameSpeed + 30);
      }
      this.cameras.main.flash(200, 231, 76, 60, false);
      AudioManager.play(this, 'wrong');
    }

    if (wasMidQuiz) this.midQuizActive = false;

    // Jubilee checkpoint: pass → next stage (after the history card, if any);
    // fail → the penalty drops the score below the target, so keep flying and retry.
    const passedCheckpoint = this.isJubilee && this.checkpointActive && correct;
    if (this.isJubilee && this.checkpointActive && !correct) {
      this.checkpointActive = false;
      this.events.emit('checkpointFailed');
    }

    if (showTimeline && timelineIndex != null) {
      const card = getJourneyTimelineCard(timelineIndex);
      if (card) {
        this.pendingStageAdvance = passedCheckpoint;
        this.triggerTimelineCard(card);
        return;
      }
    }

    if (passedCheckpoint) {
      this.finishStage();
      return;
    }

    this.isPaused = false;
    this.physics.resume();
  }

  onLegacyComplete() {
    if (this.pendingStageAdvance) {
      this.pendingStageAdvance = false;
      this.finishStage();
      return;
    }
    this.isPaused = false;
    this.physics.resume();
  }

  cleanupGameScene() {
    this.events.off('quizComplete', this.onQuizComplete, this);
    this.events.off('legacyComplete', this.onLegacyComplete, this);
    this.gameOverTimer?.remove(false);
    this.flapBoostTimer?.remove(false);
    this.speedTrail = null;
    this.slowTint = null;
    this.stageTitle = null;
    this.flapTween?.stop();
    this.wings.forEach(({ sprite }) => sprite.destroy());
    this.wings = [];
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

    this.addTwinWings();

    buildFaceTexture(this, avatar, faceKey)
      .then(() => {
        if (this.bird?.scene) {
          this.bird.setTexture(faceKey);
          this.bird.setDisplaySize(PLAYER_DISPLAY_SIZE, PLAYER_DISPLAY_SIZE);
        }
      })
      .catch(() => {
        // Photo couldn't be decoded — keep the default placeholder rather than a missing texture
      });

  }

  /**
   * Add a wing sprite pivoting at its shoulder. (dx, dy) is the shoulder offset from the
   * bird's centre; dir = 1 for a wing pointing left (positive angle lifts it), -1 for right.
   */
  addWing(texKey, dx, dy, dir, scale, depth) {
    const originX = dir === 1 ? WING_ROOT.x : 1 - WING_ROOT.x;
    const sprite = this.add.image(this.bird.x + dx, this.bird.y + dy, texKey)
      .setOrigin(originX, WING_ROOT.y)
      .setScale(scale)
      .setDepth(depth);
    this.wings.push({ sprite, dx, dy, dir });
  }

  /** Two feathered wings behind a round avatar (photo / role icon). */
  addTwinWings() {
    const scale = (PLAYER_DISPLAY_SIZE * 0.85) / WING_TEX_W;
    const dx = PLAYER_DISPLAY_SIZE * 0.3;
    this.addWing('wing_left', -dx, -4, 1, scale, 4);
    this.addWing('wing_right', dx, -4, -1, scale, 4);
  }

  startWingFlap() {
    if (!this.wings.length) return;
    this.wingFlap = { angle: 0 };
    // Slow, shallow glide-flap
    this.flapTween = this.tweens.add({
      targets: this.wingFlap,
      angle: { from: -10, to: 20 },
      duration: 340,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  /** Beat the wings faster for a moment after each jump. */
  boostWingFlap() {
    if (!this.flapTween) return;
    this.flapTween.timeScale = 1.7;
    this.flapBoostTimer?.remove(false);
    this.flapBoostTimer = this.time.delayedCall(350, () => {
      if (this.flapTween) this.flapTween.timeScale = 1;
    });
  }

  /** Keep wings attached to the bird, following its tilt. */
  syncWings() {
    if (!this.wings.length || !this.bird) return;
    const cos = Math.cos(this.bird.rotation);
    const sin = Math.sin(this.bird.rotation);
    const flap = this.wingFlap?.angle || 0;
    this.wings.forEach(({ sprite, dx, dy, dir }) => {
      sprite.setPosition(this.bird.x + dx * cos - dy * sin, this.bird.y + dx * sin + dy * cos);
      sprite.setAngle(this.bird.angle + flap * dir);
    });
  }

  createPlayerSprite() {
    const avatar = getAvatar();
    if (avatar) {
      this.createFacePlayer(avatar);
    } else {
      // Same default bird sprite for every player, regardless of role or department —
      // only a captured/uploaded photo changes how the bird looks.
      this.bird = this.physics.add.sprite(PLAYER_START_X, GAME_HEIGHT / 2, 'bird');
      this.bird.body.setSize(44, 34);
      this.bird.body.setOffset(12, 10);
      // Side-view bird: one wing on its flank, sweeping back
      this.addWing('wing_bird_left', 2, 4, 1, 0.36, 6);
    }

    this.bird.setCollideWorldBounds(true);
    this.bird.setDepth(5);
    this.bird.setGravityY(0);
    this.startWingFlap();
    this.syncWings();
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
      this.eraText.setText(milestone.era.toUpperCase());
      this.cameras.main.flash(400, 255, 215, 0, false);
    }

    const loc = CAMPUS_LOCATIONS[milestone.campusKey];
    if (loc && this.campusLabel) this.campusLabel.setText(loc);

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
    this.boostWingFlap();
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
    this.readyBadge.destroy();
    this.fillPipes();
    this.events.emit('gameStarted');
    AudioManager.playBGM(this, false);
  }

  getPipeSpacing() {
    return this.config.pipeSpacing || PIPE_SPACING;
  }

  getRightmostPipeX() {
    let maxX = Number.NEGATIVE_INFINITY;
    this.pipes.getChildren().forEach((pipe) => {
      if (pipe.getData('isMarker') && pipe.x > maxX) maxX = pipe.x;
    });
    return maxX;
  }

  /** Keep 2–3 walls on screen, with one queued just past the right edge. */
  fillPipes() {
    let x = this.getRightmostPipeX();
    if (!Number.isFinite(x)) {
      x = PLAYER_START_X + 520;
      this.spawnPipePair(x);
    }
    while (x < GAME_WIDTH + 100) {
      x += this.getPipeSpacing() + Phaser.Math.Between(-PIPE_SPACING_JITTER, PIPE_SPACING_JITTER);
      this.spawnPipePair(x);
    }
  }

  /**
   * Classic keeps one look (no levels). The Jubilee Challenge follows its stage; Department
   * levels up every WALL_LEVEL_SCORE points and never drops back (e.g. after a quiz penalty).
   */
  getWallLevel() {
    if (this.modeInfo?.classic) return 1;
    if (this.isJubilee) return this.storyLevel;
    return Math.max(this.wallLevel || 1, 1 + Math.floor(this.score / WALL_LEVEL_SCORE));
  }

  getWallColorIndex() {
    return (this.getWallLevel() - 1) % WALL_PALETTES.length;
  }

  /** On level up, quietly repaint walls the bird hasn't reached yet (no on-screen announcement). */
  checkWallLevel() {
    const level = this.getWallLevel();
    if (level === this.wallLevel) return;
    this.wallLevel = level;
    const idx = this.getWallColorIndex();

    this.pipes.getChildren().forEach((pipe) => {
      if (pipe.x < this.bird.x) return;
      pipe.setTexture(`wall_body_${idx}`);
      pipe.getData('cap')?.setTexture(`wall_cap_${idx}`);
    });
  }

  syncPhysicsBody(obj) {
    if (obj?.body?.updateFromGameObject) {
      obj.body.updateFromGameObject();
    }
  }

  update(time, delta) {
    if (this.waitingForScenery) return;
    if (this.stageTransitioning) {
      // Gameplay is frozen between stages, but keep the bird's wings, shield and the ground
      // moving so the transition feels continuous rather than stopped.
      this.syncWings();
      if (this.hasShield) this.shieldFx.setPosition(this.bird.x, this.bird.y);
      this.ground.tilePositionX += this.gameSpeed * 0.5 * (delta / 1000);
      return;
    }
    if (this.isGameOver || this.isPaused) return;

    const dt = this.slowMotion ? delta * 0.5 : delta;

    if (this.bird.body.velocity.y > MAX_FALL_SPEED) {
      this.bird.setVelocityY(MAX_FALL_SPEED);
    }

    if (!this.isStarted) {
      // Gentle hover while waiting for the first tap
      this.bird.y = GAME_HEIGHT / 2 + Math.sin(time * 0.005) * 10;
    }
    if (this.hasShield) this.shieldFx.setPosition(this.bird.x, this.bird.y);
    this.syncWings();
    if (!this.isStarted) return;

    const boost = this.speedBoost ? SPEED_BOOST_MULTIPLIER : 1;
    this.ground.tilePositionX += this.gameSpeed * boost * (dt / 1000);

    const speed = this.gameSpeed * boost * (dt / 1000);

    this.pipes.getChildren().slice().forEach((pipe) => {
      pipe.x -= speed;
      const osc = this.getPipeOscillation(pipe, time);
      pipe.y = pipe.getData('baseY') + osc;
      this.syncPhysicsBody(pipe);
      const cap = pipe.getData('cap');
      if (cap) {
        cap.x = pipe.x;
        cap.y = pipe.getData('capBaseY') + osc;
      }
      if (!pipe.getData('scored') && pipe.getData('isMarker') && pipe.x + pipe.getData('width') / 2 < this.bird.x) {
        pipe.setData('scored', true);
        this.onObstaclePassed();
      }
      if (pipe.x < -120) {
        cap?.destroy();
        pipe.destroy();
      }
    });

    this.fillPipes();

    this.powerUps.getChildren().slice().forEach((pu) => {
      pu.x -= speed;
      this.syncPhysicsBody(pu);
      this.syncPowerUpDecor(pu);
      if (pu.x < -60) this.destroyPowerUp(pu);
    });


    if (this.score >= 50 && !this.intenseBgmStarted) {
      this.intenseBgmStarted = true;
      AudioManager.playBGM(this, true);
    }

    this.updateCampusBackground();
    if (this.isJubilee) this.updateStoryBackground();
  }

  updateStoryBackground() {
    if (this.bgTransitioning || this.storyAdvancing || !this.bg) return;
    const preferredBg = this.getStoryBackgroundKey();
    if (preferredBg !== this.bg.texture.key) {
      this.transitionStoryBackground();
    }
  }

  /** Department Challenge only — Classic keeps one scenery, Jubilee uses stage scenery. */
  updateCampusBackground() {
    if (this.isJubilee || this.modeInfo?.classic) return;

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

    // Classic keeps a constant pace like the original; other modes ramp up every 5 walls
    if (!this.modeInfo?.classic && this.obstaclesPassed > 0 && this.obstaclesPassed % 5 === 0) {
      this.gameSpeed = Math.min(this.config.maxSpeed, this.config.initialSpeed + this.obstaclesPassed * 2);
      this.pipeGap = Math.max(this.config.minGap, this.config.initialGap - this.obstaclesPassed * 0.8);
    }

    if (this.modeInfo?.classic) return; // no rewards, no quizzes

    if (Math.random() < SURPRISE_REWARD_CHANCE) {
      this.triggerSurpriseReward();
    }

    // Jubilee quizzes are stage checkpoints (see checkStoryLevelComplete), not per-wall triggers
    if (!this.modeInfo?.hasQuiz || this.isPaused || this.isJubilee) return;

    // Department: quizzes at 3, 6 and 9 walls, then every 3–5 walls (see quizEngine)
    if (this.mode === 'department' && this.obstaclesPassed >= this.nextDeptQuizAt) {
      this.deptQuizCount += 1;
      this.nextDeptQuizAt = getNextDeptQuizCheckpoint(this.obstaclesPassed, this.deptQuizCount);
      this.triggerQuiz();
    }
  }

  triggerSurpriseReward() {
    const rewards = [
      { label: 'Lucky Shield!', icon: 'shield', action: () => { this.hasShield = true; this.showShieldActivation(); } },
      { label: 'Faculty Bonus!', icon: 'star', action: () => { this.scoreMultiplier = 2; this.time.delayedCall(5000, () => { this.scoreMultiplier = 1; }); } },
      { label: 'Speed Surge!', icon: 'target', action: () => { this.gameSpeed = Math.min(this.config.maxSpeed, this.gameSpeed + 40); } },
    ];
    const reward = Phaser.Utils.Array.GetRandom(rewards);
    reward.action();
    this.events.emit('powerUpCollected', { type: 'surprise', label: reward.label, icon: reward.icon });
    AudioManager.play(this, 'powerup');
  }

  triggerQuiz() {
    this.isPaused = true;
    this.physics.pause();
    const department = this.player?.department || 'IT';

    if (this.isJubilee) {
      // Random CST history question, never repeated within this playthrough
      const jubilee = getJubileeQuiz();
      if (!jubilee?.question) {
        // Quiz data failed to load — don't trap the player
        if (this.checkpointActive) {
          this.finishStage();
        } else {
          this.midQuizActive = false;
          this.isPaused = false;
          this.physics.resume();
        }
        return;
      }
      this.launchQuizScene({
        quizCategory: 'CST',
        department,
        question: jubilee.question,
        difficulty: 'history',
        timelineIndex: jubilee.timelineIndex,
        checkpoint: {
          stage: this.storyLevel,
          totalStages: STORY_LEVELS.length,
          // Stage-end checkpoints must be passed to move on; mid-stage quizzes are bonus rounds
          gating: this.checkpointActive,
        },
      });
      return;
    }

    if (this.mode === 'department') {
      // Player's department + year, with difficulty rising as more walls are flown
      const deptData = getDeptQuestion(department, this.yearKey, getDifficultyForProgress(this.obstaclesPassed));
      if (!deptData?.question) {
        this.isPaused = false;
        this.physics.resume();
        return;
      }
      this.launchQuizScene({
        quizCategory: 'department',
        department,
        question: deptData.question,
        difficulty: deptData.difficulty,
        yearKey: deptData.yearKey,
        timelineIndex: null,
      });
      return;
    }

    this.isPaused = false;
    this.physics.resume();
  }

  launchQuizScene({ quizCategory, department, question, difficulty, timelineIndex, yearKey = null, checkpoint = null }) {
    this.scene.launch('QuizScene', {
      mode: this.mode,
      quizCategory,
      department,
      score: this.score,
      obstacleCount: this.obstaclesPassed,
      quizStreak: this.quizStreak,
      question,
      difficulty,
      yearKey,
      timelineIndex,
      checkpoint,
    });
    this.scene.pause();
  }

  getPipeOscillation(obj, time) {
    const amp = obj.getData('oscAmp') || 0;
    if (!amp) return 0;
    const phase = obj.getData('oscPhase') || 0;
    const oscSpeed = obj.getData('oscSpeed') || 0.0024;
    const minOsc = obj.getData('oscMin') ?? -amp;
    const maxOsc = obj.getData('oscMax') ?? amp;
    return Phaser.Math.Clamp(Math.sin(time * oscSpeed + phase) * amp, minOsc, maxOsc);
  }

  configurePipeMotion(obj, { baseY, capBaseY, oscAmp, oscPhase, oscSpeed, oscMin, oscMax }) {
    obj.setData('baseY', baseY);
    if (capBaseY != null) obj.setData('capBaseY', capBaseY);
    obj.setData('oscAmp', oscAmp);
    obj.setData('oscPhase', oscPhase);
    obj.setData('oscSpeed', oscSpeed);
    obj.setData('oscMin', oscMin);
    obj.setData('oscMax', oscMax);
  }

  /**
   * One wall segment: a tiled sprite (so its physics body matches its size exactly)
   * plus a lip cap at the gap end.
   */
  createWall(x, y, width, height, colorIdx, capY, flipCap) {
    const wall = this.add.tileSprite(x, y, width, height, `wall_body_${colorIdx}`)
      .setTileScale(width / WALL_TEX_W, 1)
      .setDepth(2);
    this.pipes.add(wall);
    wall.body.setSize(width - 6, height, true);
    wall.body.allowGravity = false;
    wall.body.immovable = true;
    wall.body.moves = false;
    wall.setData('width', width);

    const cap = this.add.image(x, capY, `wall_cap_${colorIdx}`)
      .setDisplaySize(width + 12, WALL_CAP_H)
      .setFlipY(flipCap)
      .setDepth(3);
    wall.setData('cap', cap);
    return wall;
  }

  spawnPipePair(spawnX = GAME_WIDTH + 80) {
    const level = this.getWallLevel();
    const colorIdx = this.getWallColorIndex();
    const groundTop = GAME_HEIGHT - 60;
    const margin = 70;

    // Vary wall thickness, gap size and gap height so every wall feels different
    const width = Phaser.Math.Between(PIPE_MIN_WIDTH, PIPE_MAX_WIDTH);
    const gap = Math.max(this.config.minGap, this.pipeGap + Phaser.Math.Between(-15, 30));
    let minC = margin + gap / 2;
    let maxC = groundTop - margin - gap / 2;
    if (this.lastGapCenter != null) {
      // Keep consecutive gaps reachable
      minC = Math.max(minC, this.lastGapCenter - MAX_GAP_SHIFT);
      maxC = Math.min(maxC, this.lastGapCenter + MAX_GAP_SHIFT);
    }
    const gapCenter = Phaser.Math.Between(Math.round(minC), Math.round(maxC));
    this.lastGapCenter = gapCenter;

    const topH = gapCenter - gap / 2;
    const bottomY = gapCenter + gap / 2;

    // Walls stay still early on; from WALL_MOTION_LEVEL some drift slowly up/down
    let motion = { oscAmp: 0 };
    if (level >= WALL_MOTION_LEVEL && Math.random() < 0.35) {
      motion = {
        oscAmp: Phaser.Math.Between(16, 32),
        oscPhase: Math.random() * Math.PI * 2,
        oscSpeed: 0.0012 + Math.random() * 0.0008,
        oscMin: 50 - topH,
        oscMax: groundTop - 50 - bottomY,
      };
    }

    // Walls overshoot the screen edge / tuck under the ground so drifting never shows a seam
    const topWallH = topH + WALL_OVERSHOOT;
    const topY = topH - topWallH / 2;
    const topCapY = topH - WALL_CAP_H / 2;
    const topPipe = this.createWall(spawnX, topY, width, topWallH, colorIdx, topCapY, true);
    this.configurePipeMotion(topPipe, { ...motion, baseY: topY, capBaseY: topCapY });

    const bottomH = GAME_HEIGHT - bottomY + WALL_OVERSHOOT;
    const bottomWallY = bottomY + bottomH / 2;
    const bottomCapY = bottomY + WALL_CAP_H / 2;
    const bottomPipe = this.createWall(spawnX, bottomWallY, width, bottomH, colorIdx, bottomCapY, false);
    bottomPipe.setData('isMarker', true);
    bottomPipe.setData('scored', false);
    this.configurePipeMotion(bottomPipe, { ...motion, baseY: bottomWallY, capBaseY: bottomCapY });

    if (Math.random() < this.config.powerUpChance) {
      this.spawnPowerUp(spawnX, gapCenter);
    }
  }

  /**
   * Spawn a power-up collectible (all modes share these visuals; the mode decides which
   * power-up set is used). The physics sprite is the coin itself; the glow and the animated
   * character ride along in two containers kept in sync in update().
   */
  spawnPowerUp(x, y) {
    const set = this.isJubilee ? JUBILEE_POWER_UPS : POWER_UPS;
    const type = Phaser.Utils.Array.GetRandom(Object.keys(set));
    const visual = set[type].visual;
    const v = POWER_UP_VISUALS[visual];

    const pu = this.powerUps.create(x, y + Phaser.Math.Between(-30, 30), `pu_badge_${visual}`);
    pu.setDisplaySize(POWER_UP_DISPLAY_SIZE, POWER_UP_DISPLAY_SIZE);
    pu.setData('type', type);
    pu.setData('visual', visual);
    // Pickup areas are the same as before the redesign (sizes in source px of the 128px texture)
    const s = pu.scaleX;
    if (this.isJubilee) {
      const r = 22.75 / s;
      pu.body.setCircle(r, 64 - r, 64 - r);
    } else {
      pu.body.setSize(30 / s, 30 / s);
    }
    pu.body.allowGravity = false;
    pu.body.moves = false;
    pu.setDepth(4);

    const size = POWER_UP_DISPLAY_SIZE;
    const aura = this.add.image(0, 0, 'pu_aura').setDisplaySize(size * 1.55, size * 1.55).setTint(v.color).setAlpha(0.55);
    const icon = this.add.image(0, 0, `pu_icon_${visual}`).setDisplaySize(size, size);
    const gloss = this.add.image(0, 0, 'pu_gloss').setDisplaySize(size, size);
    const back = this.add.container(pu.x, pu.y, [aura]).setDepth(3.9);
    const front = this.add.container(pu.x, pu.y, [icon, gloss]).setDepth(4.1);
    pu.setData('decor', [back, front]);

    const auraScale = aura.scaleX;
    const iconScale = icon.scaleX;
    const loop = (cfg) => this.tweens.add({ yoyo: true, repeat: -1, ease: 'Sine.easeInOut', ...cfg });

    // Gentle float + breathing glow shared by every collectible
    loop({ targets: pu, y: pu.y + 6, duration: 950 });
    loop({ targets: aura, alpha: 0.85, scale: auraScale * 1.08, duration: 900 });

    switch (visual) {
      case 'rabbit': {
        // Quick hops with a little squash, speed streaks whooshing off the back
        loop({ targets: icon, y: -7, scaleX: iconScale * 0.97, scaleY: iconScale * 1.04, duration: 190, ease: 'Quad.easeOut' });
        [-11, 0, 11].forEach((dy, i) => {
          const streak = this.add.image(-size * 0.42, dy, 'speed_line').setOrigin(1, 0.5).setScale(1.3, 1.6).setTint(0xffe7b0);
          back.add(streak);
          this.tweens.add({
            targets: streak, scaleX: { from: 0.4, to: 1.5 }, alpha: { from: 0.95, to: 0.15 },
            duration: 260, repeat: -1, delay: i * 85,
          });
        });
        break;
      }
      case 'snail': {
        // Slow creep and stretch, with lazy slow-motion ripples
        loop({ targets: icon, x: 2.5, scaleX: iconScale * 1.05, duration: 1400 });
        [0, 900].forEach((delay) => {
          const ripple = this.add.circle(0, 0, size * 0.46).setStrokeStyle(3, v.color, 0.9);
          back.add(ripple);
          this.tweens.add({
            targets: ripple, scale: { from: 1, to: 1.6 }, alpha: { from: 0.8, to: 0 },
            duration: 1800, repeat: -1, delay, ease: 'Sine.easeOut',
          });
        });
        break;
      }
      case 'star': {
        // Sway + twinkle, with sparkles popping around it
        loop({ targets: icon, angle: { from: -14, to: 14 }, duration: 1100 });
        loop({ targets: icon, scale: iconScale * 1.08, duration: 550 });
        [[26, -24, 0], [-28, -16, 320], [22, 25, 640]].forEach(([sx, sy, delay]) => {
          const sparkle = this.add.image(sx, sy, 'pu_sparkle').setScale(0).setTint(0xfff1a8);
          front.add(sparkle);
          this.tweens.add({
            targets: sparkle, scale: 0.6, angle: 90, duration: 420, yoyo: true, repeat: -1, repeatDelay: 380, delay,
          });
        });
        break;
      }
      case 'shield':
        // Steady protective pulse
        loop({ targets: icon, scale: iconScale * 1.07, duration: 650 });
        loop({ targets: aura, alpha: 1, scale: auraScale * 1.22, duration: 650 });
        break;
    }
  }

  syncPowerUpDecor(pu) {
    pu.getData('decor')?.forEach((d) => d.setPosition(pu.x, pu.y));
  }

  /** Remove a collectible and everything attached to it (tweens included). */
  destroyPowerUp(pu) {
    pu.getData('decor')?.forEach((d) => {
      this.tweens.killTweensOf(d.list);
      d.destroy();
    });
    this.tweens.killTweensOf(pu);
    pu.destroy();
  }

  collectPowerUp(bird, powerUp) {
    const type = powerUp.getData('type');
    const visual = powerUp.getData('visual');
    const { x, y } = powerUp;
    this.destroyPowerUp(powerUp);
    AudioManager.play(this, 'powerup');
    this.playCollectFeedback(x, y, visual);

    if (this.isJubilee) {
      const cfg = JUBILEE_POWER_UPS[type];
      this.activateCollectible(type, cfg);
      this.events.emit('powerUpCollected', { type, label: cfg.label, visual });
    } else {
      this.activatePowerUp(type);
      this.events.emit('powerUpCollected', { type, label: POWER_UPS[type].label, visual });
    }
  }

  /** Department Challenge power-up effects (unchanged; visuals shared with Jubilee). */
  activatePowerUp(type) {
    const cfg = POWER_UPS[type];
    switch (type) {
      case 'coffee':
        this.slowMotion = true;
        this.showSlowTint(true);
        this.time.delayedCall(cfg.duration, () => {
          this.slowMotion = false;
          this.showSlowTint(false);
        });
        break;
      case 'shield':
        this.hasShield = true;
        this.showShieldActivation();
        break;
      case 'double':
        this.scoreMultiplier = 2;
        this.time.delayedCall(cfg.duration, () => { this.scoreMultiplier = 1; });
        break;
    }
  }

  /**
   * Pickup feedback: the coin pops, a coloured ring snaps out, and a short burst that says
   * what was collected (streaks / ripples / stars / sparkles). ~0.4s, never pauses play.
   * The name of the power-up is shown by the HUD label (UIScene.showPowerUpLabel).
   */
  playCollectFeedback(x, y, visual) {
    const v = POWER_UP_VISUALS[visual];
    const size = POWER_UP_DISPLAY_SIZE;
    const layers = [`pu_badge_${visual}`, `pu_icon_${visual}`, 'pu_gloss']
      .map((key) => this.add.image(0, 0, key).setDisplaySize(size, size));
    const pop = this.add.container(x, y, layers).setDepth(26);
    this.tweens.add({ targets: pop, scale: 1.7, alpha: 0, duration: 240, ease: 'Quad.easeOut', onComplete: () => pop.destroy() });

    const ring = this.add.circle(x, y, size * 0.4).setStrokeStyle(4, v.color, 1).setDepth(26);
    this.tweens.add({ targets: ring, scale: 2.6, alpha: 0, duration: 320, ease: 'Quad.easeOut', onComplete: () => ring.destroy() });

    const burst = (texture, config, count) => {
      const emitter = this.add.particles(x, y, texture, { emitting: false, ...config }).setDepth(26);
      emitter.explode(count);
      this.time.delayedCall(700, () => emitter.destroy());
    };

    switch (visual) {
      case 'rabbit': // quick speed streak
        burst('speed_line', {
          angle: { min: 165, max: 195 }, speed: { min: 520, max: 820 }, lifespan: 220,
          scaleX: { start: 1.8, end: 0.4 }, scaleY: 1.4, alpha: { start: 1, end: 0 }, tint: [0xffffff, 0xffd27a],
        }, 9);
        break;
      case 'snail': // brief slow-motion ripples
        [0, 140].forEach((delay) => {
          const ripple = this.add.circle(x, y, size * 0.45).setStrokeStyle(3, v.color, 0.9).setDepth(26).setAlpha(0);
          this.tweens.add({
            targets: ripple, scale: { from: 1, to: 2.4 }, alpha: { from: 0.9, to: 0 },
            duration: 620, delay, ease: 'Sine.easeOut', onComplete: () => ripple.destroy(),
          });
        });
        break;
      case 'star': // small burst of stars
        burst('pu_icon_star', {
          speed: { min: 140, max: 300 }, lifespan: { min: 380, max: 560 }, scale: { start: 0.16, end: 0 },
          rotate: { start: 0, end: 360 }, gravityY: 260,
        }, 8);
        burst('pu_sparkle', { speed: { min: 60, max: 180 }, lifespan: 380, scale: { start: 0.55, end: 0 }, tint: 0xfff1a8 }, 8);
        break;
      default: // shield: bright sparkles in the power-up colour
        burst('pu_sparkle', {
          speed: { min: 100, max: 240 }, lifespan: 400, scale: { start: 0.6, end: 0 }, tint: [0xffffff, v.color],
        }, 12);
    }
  }

  /** Shield on: the bubble pops in around the bird, a ring flares out, then a steady pulse. */
  showShieldActivation() {
    this.tweens.killTweensOf(this.shieldFx);
    this.shieldFx.setPosition(this.bird.x, this.bird.y).setVisible(true).setAlpha(0.95)
      .setScale(this.shieldBaseScale * 0.6);
    this.tweens.add({ targets: this.shieldFx, scale: this.shieldBaseScale, duration: 220, ease: 'Back.easeOut' });
    this.tweens.add({
      targets: this.shieldFx,
      alpha: { from: 0.95, to: 0.55 },
      scale: { from: this.shieldBaseScale, to: this.shieldBaseScale * 1.06 },
      duration: 700,
      delay: 220,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    const flare = this.add.circle(this.bird.x, this.bird.y, PLAYER_DISPLAY_SIZE * 0.6)
      .setStrokeStyle(5, POWER_UP_VISUALS.shield.color, 1).setDepth(7);
    this.tweens.add({
      targets: flare, scale: 1.9, alpha: 0, duration: 360, ease: 'Quad.easeOut', onComplete: () => flare.destroy(),
    });
  }

  /** Start/refresh a timed effect; collecting the same power-up again extends it. */
  setTimedEffect(type, duration, onEnd) {
    this.effectTimers[type]?.remove(false);
    this.effectTimers[type] = this.time.delayedCall(duration, () => {
      this.effectTimers[type] = null;
      onEnd();
    });
  }

  activateCollectible(type, cfg) {
    switch (type) {
      case 'rabbit':
        this.speedBoost = true;
        this.startSpeedTrail();
        this.setTimedEffect('rabbit', cfg.duration, () => {
          this.speedBoost = false;
          this.stopSpeedTrail();
        });
        break;
      case 'snail':
        this.slowMotion = true;
        this.showSlowTint(true);
        this.setTimedEffect('snail', cfg.duration, () => {
          this.slowMotion = false;
          this.showSlowTint(false);
        });
        break;
      case 'star':
        this.scoreMultiplier = 2;
        this.setTimedEffect('star', cfg.duration, () => { this.scoreMultiplier = 1; });
        break;
      default: // shield
        this.hasShield = true;
        this.showShieldActivation();
    }
  }

  /** Rabbit boost: speed streaks streaming off the bird. */
  startSpeedTrail() {
    if (this.speedTrail) return;
    this.speedTrail = this.add.particles(0, 0, 'speed_line', {
      speedX: { min: -520, max: -360 },
      lifespan: 260,
      frequency: 35,
      quantity: 1,
      alpha: { start: 0.9, end: 0 },
      scaleX: { start: 1.2, end: 0.6 },
      emitZone: { type: 'random', source: new Phaser.Geom.Rectangle(-30, -26, 12, 52) },
    }).setDepth(3);
    this.speedTrail.startFollow(this.bird);
  }

  stopSpeedTrail() {
    const trail = this.speedTrail;
    if (!trail) return;
    this.speedTrail = null;
    trail.stop();
    this.time.delayedCall(300, () => trail.destroy());
  }

  /** Snail: a soft blue wash over the screen while time is slowed. */
  showSlowTint(on) {
    if (!this.slowTint) {
      this.slowTint = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x6aa8ff, 1)
        .setAlpha(0).setDepth(15);
    }
    this.tweens.killTweensOf(this.slowTint);
    this.tweens.add({ targets: this.slowTint, alpha: on ? 0.12 : 0, duration: 250 });
  }

  addScore(points) {
    const gained = points * this.scoreMultiplier;
    this.score += gained;
    this.events.emit('scoreUpdate', this.score);
    this.checkWallLevel();
    if (this.isJubilee) {
      this.storyTotalScore += gained;
      this.checkStoryLevelComplete();
    }
  }

  hitPipe(bird, pipe) {
    // Overlap fires every frame while touching; only the first contact counts.
    if (this.isGameOver || this.storyAdvancing) return;
    const impact = this.getImpactPoint(pipe);
    if (this.hasShield) {
      this.hasShield = false;
      this.shieldFx.setVisible(false);
      this.tweens.killTweensOf(this.shieldFx);
      this.spawnImpactSparks(impact, 0.5);
      pipe.getData('cap')?.destroy();
      pipe.destroy();
      return;
    }
    this.spawnImpactSparks(impact, 1);
    this.gameOver();
  }

  /** Closest point on the wall's hitbox to the bird, plus the direction back toward the bird. */
  getImpactPoint(pipe) {
    const b = pipe.body;
    let x = Phaser.Math.Clamp(this.bird.x, b.left, b.right);
    let y = Phaser.Math.Clamp(this.bird.y, b.top, b.bottom);
    if (x === this.bird.x && y === this.bird.y) {
      // Bird centre already inside the wall: treat it as a hit on the wall's front face
      x = b.left;
    }
    const dx = this.bird.x - x;
    const dy = this.bird.y - y;
    const len = Math.hypot(dx, dy);
    if (!len) return { x, y, nx: -1, ny: 0 };
    return { x, y, nx: dx / len, ny: dy / len };
  }

  /** One-shot burst of sparks + flash at the impact point. Everything self-destructs. */
  spawnImpactSparks({ x, y, nx, ny }, intensity = 1) {
    const baseAngle = Phaser.Math.RadToDeg(Math.atan2(ny, nx));
    const common = {
      tint: [0xffffff, 0xfff1a8, 0xffc233, 0xff7a1a],
      blendMode: 'ADD',
      gravityY: 900,
      emitting: false,
    };

    // Fast, small sparks sprayed back off the wall
    const fast = this.add.particles(x, y, 'spark', {
      ...common,
      angle: { min: baseAngle - 75, max: baseAngle + 75 },
      speed: { min: 320, max: 820 },
      scale: { start: 0.7, end: 0 },
      lifespan: { min: 220, max: 480 },
    }).setDepth(30);
    // Fewer, larger embers that linger a little longer
    const embers = this.add.particles(x, y, 'spark', {
      ...common,
      angle: { min: baseAngle - 110, max: baseAngle + 110 },
      speed: { min: 90, max: 300 },
      scale: { start: 1.4, end: 0 },
      lifespan: { min: 380, max: 700 },
    }).setDepth(30);

    fast.explode(Math.round(32 * intensity));
    embers.explode(Math.round(12 * intensity));

    const flash = this.add.circle(x, y, 12, 0xfff6d0, 0.95).setBlendMode('ADD').setDepth(31);
    this.tweens.add({
      targets: flash,
      scale: 4.5,
      alpha: 0,
      duration: 200,
      ease: 'Quad.easeOut',
      onComplete: () => flash.destroy(),
    });
    this.cameras.main.flash(90, 255, 245, 220, false);

    this.time.delayedCall(800, () => {
      fast.destroy();
      embers.destroy();
    });
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
    if (this.isGameOver || this.storyAdvancing) return;
    this.isGameOver = true;
    AudioManager.play(this, 'hit');
    AudioManager.play(this, 'gameover', { volume: 0.5 });
    AudioManager.stopBGM(this);
    if (this.bird?.setTint) this.bird.setTint(0xff0000);
    this.flapTween?.pause();
    this.wings.forEach(({ sprite }) => sprite.setTint(0xff6666));
    this.physics.pause();
    this.cameras.main.shake(300, 0.02);

    this.gameOverTimer = this.time.delayedCall(600, () => {
      if (!this.scene.isActive('GameScene')) return;
      this.scene.stop('UIScene');
      this.scene.stop('QuizScene');
      this.scene.stop('LegacyScene');
      this.scene.start('GameOverScene', {
        score: this.isJubilee ? this.storyTotalScore : this.score,
        mode: this.mode,
        player: this.player,
        quizStreak: this.quizStreak,
        legacyTriggered: this.legacyTriggered,
      });
    });
  }

  getStoryBackgroundKey() {
    const level = STORY_LEVELS[this.storyLevel - 1] || STORY_LEVELS[0];
    const key = level.bgKey;
    if (this.textures.exists(key)) return key;
    return this.bgKeys[Math.min(this.storyLevel - 1, this.bgKeys.length - 1)] || 'bg_foundation';
  }

  applyStoryLevelSettings() {
    const level = STORY_LEVELS[this.storyLevel - 1] || STORY_LEVELS[0];
    this.config = {
      ...MODE_CONFIG.journey,
      initialSpeed: level.initialSpeed,
      maxSpeed: level.maxSpeed,
      initialGap: level.initialGap,
      minGap: level.minGap,
      spawnInterval: level.spawnInterval,
      pipeSpacing: level.pipeSpacing || MODE_CONFIG.journey.pipeSpacing,
    };
    this.gameSpeed = this.config.initialSpeed;
    this.pipeGap = this.config.initialGap;
  }

  /**
   * Jubilee quizzes: a mid-stage bonus quiz at each quizAt score, and the stage-end checkpoint
   * at requiredScore that must be passed to move on (10 quizzes across the 6 stages).
   */
  checkStoryLevelComplete() {
    if (!this.isJubilee || this.isGameOver || this.storyAdvancing || this.checkpointActive || this.midQuizActive) return;
    const level = STORY_LEVELS[this.storyLevel - 1];
    if (!level) return;

    const midQuiz = (level.quizAt || []).find((at) => this.score >= at && !this.midQuizzesDone.has(at));
    if (midQuiz != null && this.score < level.requiredScore) {
      this.midQuizzesDone.add(midQuiz);
      this.midQuizActive = true;
      this.triggerQuiz();
      return;
    }
    if (this.score < level.requiredScore) return;

    this.checkpointActive = true;
    this.events.emit('checkpointReached', { stage: this.storyLevel });
    this.triggerQuiz();
  }

  /** Checkpoint passed: move to the next scene, or finish the challenge after the last stage. */
  finishStage() {
    if (this.storyLevel >= STORY_LEVELS.length) {
      this.completeStoryMode();
      return;
    }
    this.advanceStoryLevel();
  }

  transitionStoryBackground() {
    this.crossfadeBackground(this.getStoryBackgroundKey());
  }

  /**
   * Crossfade to a new scenery: the next image fades in over the current one while easing
   * from a slight zoom, so there's never a flash to black or an instant swap.
   */
  crossfadeBackground(key, duration = 850) {
    if (this.bgTransitioning || !this.bg || this.bg.texture.key === key) return;
    this.bgTransitioning = true;

    const next = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, key).setDepth(-1.9).setAlpha(0);
    next.setDisplaySize(GAME_WIDTH, GAME_HEIGHT);
    const sx = next.scaleX;
    const sy = next.scaleY;
    next.setScale(sx * 1.08, sy * 1.08);

    this.tweens.add({
      targets: next,
      alpha: 1,
      scaleX: sx,
      scaleY: sy,
      duration,
      ease: 'Sine.easeOut',
      onComplete: () => {
        this.bg.destroy();
        this.bg = next.setDepth(-2);
        this.bgTransitioning = false;
      },
    });
  }

  /** Slide + fade the current walls and power-ups away (removed from play immediately). */
  fadeOutObstacles(duration = 380) {
    this.pipes.getChildren().slice().forEach((pipe) => {
      const cap = pipe.getData('cap');
      this.pipes.remove(pipe);
      this.tweens.add({
        targets: cap ? [pipe, cap] : pipe,
        alpha: 0,
        x: '-=70',
        duration,
        ease: 'Quad.easeIn',
        onComplete: () => {
          cap?.destroy();
          pipe.destroy();
        },
      });
    });
    this.powerUps.getChildren().slice().forEach((pu) => {
      this.powerUps.remove(pu);
      this.tweens.killTweensOf(pu);
      this.tweens.add({
        targets: [pu, ...(pu.getData('decor') || [])],
        alpha: 0,
        duration,
        onComplete: () => this.destroyPowerUp(pu),
      });
    });
    this.pipeTimer = 0;
    this.lastGapCenter = null;
  }

  /**
   * Checkpoint passed (and history card dismissed, if any) → smooth hand-off to the next stage:
   *   walls clear + bird glides level  →  scenery crossfades, stage title slides in
   *   →  new walls fade in  →  play resumes with a flap.
   * Gameplay is frozen throughout (no scoring or collisions); only visuals move.
   */
  advanceStoryLevel() {
    this.storyAdvancing = true;
    this.stageTransitioning = true;
    this.isPaused = true;
    this.physics.pause();
    this.events.emit('storyLevelComplete', { level: this.storyLevel, storyComplete: false });

    this.fadeOutObstacles();

    // Bird eases to the middle and levels out, then hovers — no snapping
    this.tweens.killTweensOf(this.bird);
    this.bird.body.setVelocity(0, 0);
    this.tweens.add({
      targets: this.bird,
      y: GAME_HEIGHT / 2,
      angle: 0,
      duration: 650,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        this.tweens.add({
          targets: this.bird, y: GAME_HEIGHT / 2 - 10, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
        });
      },
    });

    this.time.delayedCall(320, () => {
      this.storyLevel += 1;
      this.score = 0;
      this.obstaclesPassed = 0;
      this.midQuizzesDone.clear();
      this.applyStoryLevelSettings();
      this.checkWallLevel();
      this.events.emit('scoreUpdate', this.score);
      this.events.emit('storyLevelChange', this.storyLevel);
      this.cameras.main.flash(260, 255, 228, 160, false);
      this.crossfadeBackground(this.getStoryBackgroundKey());
      this.showStageTitle(this.storyLevel);
    });

    this.time.delayedCall(1050, () => {
      // Next stage's walls fade in so the player can see what's coming before continuing
      this.fillPipes();
      this.pipes.getChildren().forEach((pipe) => {
        const cap = pipe.getData('cap');
        const targets = cap ? [pipe, cap] : [pipe];
        targets.forEach((t) => t.setAlpha(0));
        this.tweens.add({ targets, alpha: 1, duration: 350 });
      });
    });

    this.time.delayedCall(1450, () => this.beginNextStage());
  }

  /** "STAGE N" card that slides in during the scenery change. */
  showStageTitle(stage) {
    this.stageTitle?.destroy();
    const y = GAME_HEIGHT / 2 - 125;
    const title = this.add.text(0, 0, `STAGE ${stage}`, {
      fontFamily: 'Orbitron', fontSize: '44px', fontStyle: 'bold', color: '#ffe27a',
      stroke: '#0f1f33', strokeThickness: 7,
    }).setOrigin(0.5);
    const sub = this.add.text(0, 42, `SILVER JUBILEE CHALLENGE · ${stage} / ${STORY_LEVELS.length}`, {
      fontFamily: 'Orbitron', fontSize: '14px', color: '#e8eef7',
      stroke: '#0f1f33', strokeThickness: 4,
    }).setOrigin(0.5);
    this.stageTitle = this.add.container(GAME_WIDTH / 2 + 90, y, [title, sub]).setDepth(40).setAlpha(0);
    this.tweens.add({ targets: this.stageTitle, x: GAME_WIDTH / 2, alpha: 1, duration: 380, ease: 'Cubic.easeOut' });
  }

  /** Transition finished: clear the title, unfreeze and give the bird a flap. */
  beginNextStage() {
    if (this.isGameOver) return;
    if (this.stageTitle) {
      const title = this.stageTitle;
      this.stageTitle = null;
      this.tweens.add({ targets: title, alpha: 0, y: title.y - 20, duration: 250, onComplete: () => title.destroy() });
    }
    this.tweens.killTweensOf(this.bird);
    this.stageTransitioning = false;
    this.checkpointActive = false;
    this.storyAdvancing = false;
    this.isPaused = false;
    this.physics.resume();
    this.handleJump();
  }

  completeStoryMode() {
    if (this.isGameOver) return;
    this.isGameOver = true;
    this.storyAdvancing = true;
    this.isPaused = true;
    this.physics.pause();
    AudioManager.stopBGM(this);
    AudioManager.play(this, 'powerup');
    this.events.emit('storyLevelComplete', { level: this.storyLevel, storyComplete: true });

    this.gameOverTimer = this.time.delayedCall(1800, () => {
      if (!this.scene.isActive('GameScene')) return;
      this.scene.stop('UIScene');
      this.scene.stop('QuizScene');
      this.scene.stop('LegacyScene');
      this.scene.start('GameOverScene', {
        score: this.storyTotalScore,
        mode: this.mode,
        player: this.player,
        quizStreak: this.quizStreak,
        legacyTriggered: this.legacyTriggered,
        storyComplete: true,
      });
    });
  }
}
