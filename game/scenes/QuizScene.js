import { GAME_WIDTH, GAME_HEIGHT, COLORS, QUIZ_BONUS, QUIZ_PENALTY, QUIZ_TIMER_SECONDS, QUIZ_STREAK_BONUS, QUIZ_STREAK_THRESHOLD } from '../config/constants.js';
import { recordQuizAnswer } from '../utils/achievements.js';
import { AudioManager } from '../utils/audio.js';
import { UIHelper } from '../utils/UIHelper.js';

/**
 * QuizScene — Separate UI for Journey (CST history) vs Department challenges.
 */
export class QuizScene extends Phaser.Scene {
  constructor() {
    super({ key: 'QuizScene' });
  }

  init(data) {
    this.mode = data.mode || 'journey';
    this.quizCategory = data.quizCategory || 'CST';
    this.department = data.department || 'IT';
    this.score = data.score || 0;
    this.obstacleCount = data.obstacleCount || 0;
    this.quizStreak = data.quizStreak || 0;
    this.question = data.question || null;
    this.difficulty = data.difficulty || 'easy';
    this.timelineIndex = data.timelineIndex ?? null;
    /** Department question-bank year, e.g. 'year2' */
    this.yearKey = data.yearKey || null;
    /** Silver Jubilee quiz: { stage, totalStages, gating } — gating = stage-end checkpoint */
    this.checkpoint = data.checkpoint || null;
  }

  create() {
    if (!this.question) {
      this.closeWithoutQuiz();
      return;
    }

    AudioManager.play(this, 'quiz_correct', { volume: 0.25 });

    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x004f8a, 0.82)
      .setDepth(0).setInteractive();

    const cardW = GAME_WIDTH - 40;
    const cardH = 430;
    const cardY = GAME_HEIGHT / 2 - 15;

    this.add.rectangle(GAME_WIDTH / 2, cardY, cardW, cardH, 0x0067b1, 0.75)
      .setStrokeStyle(2, 0x0094db, 0.6).setDepth(1);

    const isJourney = this.mode === 'journey';
    const gating = this.checkpoint?.gating !== false;
    const quizTitle = this.checkpoint
      ? (gating ? `Stage ${this.checkpoint.stage} Checkpoint` : `Stage ${this.checkpoint.stage} Quiz`)
      : isJourney ? 'CST History Check' : `${this.department} Challenge`;
    const quizIcon = isJourney ? 'pin' : 'target';
    const typeLabels = { year_match: 'Year → Event', true_false: 'True / False' };
    const typeLabel = typeLabels[this.question.type] || 'Multiple Choice';
    const difficultyLabel = this.difficulty.charAt(0).toUpperCase() + this.difficulty.slice(1);
    const yearLabel = this.yearKey ? `Year ${this.yearKey.replace('year', '')} · ` : '';
    const quizSubtitle = this.checkpoint
      ? (gating
        ? `CST History · ${typeLabel} — answer correctly to unlock the next scene`
        : `CST History · ${typeLabel} — bonus quiz`)
      : isJourney
        ? `Score ${this.score} — ${typeLabel}`
        : `${yearLabel}${difficultyLabel} · ${typeLabel}`;

    const titleText = this.add.text(GAME_WIDTH / 2 + 12, cardY - cardH / 2 + 28, quizTitle, {
      fontFamily: 'Orbitron', fontSize: '20px', color: COLORS.gold, fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(2);
    UIHelper.drawIcon(this, quizIcon, GAME_WIDTH / 2 - titleText.width / 2 - 16, cardY - cardH / 2 + 28, 12, COLORS.gold, 2);

    this.add.text(GAME_WIDTH / 2, cardY - cardH / 2 + 54, quizSubtitle, {
      fontFamily: 'Inter', fontSize: '12px', color: COLORS.textMuted,
    }).setOrigin(0.5).setDepth(2);

    if (this.quizStreak >= 2) {
      const streakText = this.add.text(GAME_WIDTH / 2 + 10, cardY - cardH / 2 + 72, `Streak: ${this.quizStreak}`, {
        fontFamily: 'Orbitron', fontSize: '14px', color: COLORS.gold,
      }).setOrigin(0.5).setDepth(2);
      UIHelper.drawIcon(this, 'flame', GAME_WIDTH / 2 - streakText.width / 2 - 12, cardY - cardH / 2 + 72, 9, COLORS.gold, 2);
    }

    this.timeLeft = QUIZ_TIMER_SECONDS;
    const timerLabel = this.add.text(GAME_WIDTH / 2 + 8, cardY - cardH / 2 + 92, `${this.timeLeft}s`, {
      fontFamily: 'Orbitron', fontSize: '16px', color: COLORS.silver,
    }).setOrigin(0.5).setDepth(2);
    this.timerIcon = UIHelper.drawIcon(this, 'clock', GAME_WIDTH / 2 - timerLabel.width / 2 - 12, cardY - cardH / 2 + 92, 10, COLORS.silver, 2);
    this.timerText = timerLabel;

    this.timerEvent = this.time.addEvent({
      delay: 1000,
      repeat: QUIZ_TIMER_SECONDS - 1,
      callback: () => {
        this.timeLeft--;
        this.timerText.setText(`${this.timeLeft}s`);
        if (this.timeLeft <= 5 && !this._timerIconWarned) {
          this._timerIconWarned = true;
          this.timerText.setColor('#e74c3c');
          const { x, y } = this.timerIcon;
          this.timerIcon.destroy();
          this.timerIcon = UIHelper.drawIcon(this, 'clock', x, y, 10, '#e74c3c', 2);
        }
        if (this.timeLeft <= 0) this.finishQuiz(false);
      },
    });

    this.add.text(GAME_WIDTH / 2, cardY - 55, this.question.q, {
      fontFamily: 'Inter', fontSize: '17px', color: COLORS.text,
      wordWrap: { width: cardW - 40 }, align: 'center',
    }).setOrigin(0.5).setDepth(2);

    const optionLabels = ['A', 'B', 'C', 'D'];
    // Four 46px options at 52px spacing end clear of the legend row at the bottom of the card
    const startY = cardY - 5;

    this.question.options.forEach((opt, idx) => {
      const optY = startY + idx * 52;
      const btnW = cardW - 50;
      const btnBg = this.add.rectangle(GAME_WIDTH / 2, optY, btnW, 46, 0x004f8a, 0.85)
        .setStrokeStyle(1, 0x0094db, 0.4)
        .setInteractive({ useHandCursor: true }).setDepth(2);

      this.add.text(GAME_WIDTH / 2 - btnW / 2 + 16, optY, `${optionLabels[idx]}.`, {
        fontFamily: 'Orbitron', fontSize: '14px', color: COLORS.gold,
      }).setOrigin(0, 0.5).setDepth(3);

      this.add.text(GAME_WIDTH / 2 - btnW / 2 + 40, optY, opt, {
        fontFamily: 'Inter', fontSize: '15px', color: COLORS.text,
        wordWrap: { width: btnW - 55 },
      }).setOrigin(0, 0.5).setDepth(3);

      btnBg.on('pointerover', () => btnBg.setFillStyle(0x0094db, 0.6));
      btnBg.on('pointerout', () => btnBg.setFillStyle(0x004f8a, 0.85));
      btnBg.on('pointerdown', () => {
        if (this.answered) return;
        this.finishQuiz(idx === this.question.answer, btnBg);
      });
    });

    const legendY = cardY + cardH / 2 - 22;
    const legendParts = [
      { icon: 'check', text: `+${QUIZ_BONUS} pts` },
      { icon: 'flame', text: `Streak bonus after ${QUIZ_STREAK_THRESHOLD}` },
      { icon: 'cross', text: `-${QUIZ_PENALTY}` },
    ];
    const legendTexts = legendParts.map((p) => this.add.text(0, 0, p.text, {
      fontFamily: 'Inter', fontSize: '12px', color: COLORS.textMuted,
    }));
    const gap = 22;
    const totalW = legendTexts.reduce((sum, t) => sum + t.width, 0) + gap * (legendParts.length - 1) + legendParts.length * 18;
    let curX = GAME_WIDTH / 2 - totalW / 2;
    legendParts.forEach((p, idx) => {
      UIHelper.drawIcon(this, p.icon, curX + 8, legendY, 7, COLORS.textMuted, 2);
      legendTexts[idx].setPosition(curX + 18, legendY - legendTexts[idx].height / 2).setDepth(2);
      curX += 18 + legendTexts[idx].width + gap;
    });

    this.answered = false;
    this.cameras.main.fadeIn(200);
  }

  closeWithoutQuiz() {
    const gameScene = this.scene.get('GameScene');
    gameScene.isPaused = false;
    this.scene.stop('QuizScene');
    this.scene.resume('GameScene');
    gameScene.physics.resume();
  }

  finishQuiz(correct, selectedBtn) {
    if (this.answered) return;
    this.answered = true;
    this.timerEvent?.remove();

    const newStreak = correct ? this.quizStreak + 1 : 0;
    recordQuizAnswer(correct, newStreak);
    AudioManager.play(this, correct ? 'quiz_correct' : 'quiz_wrong');

    if (selectedBtn) {
      selectedBtn.setFillStyle(correct ? 0x2ecc71 : 0xe74c3c, 0.9);
    }

    const streakBonus = correct && newStreak >= QUIZ_STREAK_THRESHOLD ? QUIZ_STREAK_BONUS : 0;
    const isJourney = this.mode === 'journey';

    const resultMsg = correct
      ? (streakBonus ? `Nice! +${QUIZ_BONUS} & streak bonus!` : `Correct! +${QUIZ_BONUS} pts`)
      : this.checkpoint
        ? (this.checkpoint.gating === false
          ? `Missed it — −${Math.abs(QUIZ_PENALTY)} pts`
          : `Missed — −${Math.abs(QUIZ_PENALTY)} pts, earn them back to retry`)
        : `Missed it — −${QUIZ_PENALTY} pts`;

    const resultY = GAME_HEIGHT / 2 + 210;
    const resultText = this.add.text(GAME_WIDTH / 2 + 14, resultY, resultMsg, {
      fontFamily: 'Orbitron', fontSize: '20px',
      color: correct ? '#2ecc71' : '#e74c3c', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(10).setAlpha(0);
    const resultIcon = UIHelper.drawIcon(this, correct ? 'check' : 'cross', GAME_WIDTH / 2 - resultText.width / 2 - 16, resultY, 12, correct ? '#2ecc71' : '#e74c3c', 10)
      .setAlpha(0);

    this.tweens.add({
      targets: [resultText, resultIcon], alpha: 1,
      scaleX: { from: 0.5, to: 1 }, scaleY: { from: 0.5, to: 1 },
      duration: 300, ease: 'Back.easeOut',
    });

    this.time.delayedCall(1200, () => {
      const gameScene = this.scene.get('GameScene');
      const showTimeline = isJourney && this.timelineIndex != null;
      gameScene.events.emit('quizComplete', {
        correct,
        bonus: correct ? QUIZ_BONUS : -QUIZ_PENALTY,
        streakBonus,
        speedPenalty: !correct,
        showTimeline,
        timelineIndex: this.timelineIndex,
      });
      this.scene.stop('QuizScene');
      if (!showTimeline) {
        this.scene.resume('GameScene');
      }
    });
  }
}
