import { GAME_WIDTH, GAME_HEIGHT, COLORS, MODES, ROLES } from '../config/constants.js';
import { getPlayer, updateBestScore, addScoreToHistory, getScoreStats } from '../utils/storage.js';
import { saveLeaderboardScore, isFirebaseConfigured } from '../firebase.js';
import { UIHelper } from '../utils/UIHelper.js';
import { AudioManager } from '../utils/audio.js';

/**
 * GameOverScene — End-of-game summary with score tracking and leaderboard submission.
 */
export class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameOverScene' });
  }

  init(data) {
    this.score = data?.score || 0;
    this.mode = data?.mode || 'flappy_cst';
    this.player = data?.player;
    this.quizStreak = data?.quizStreak || 0;
  }

  create() {
    UIHelper.setVideoBackground(this);
    UIHelper.createGlassOverlay(this, 0.12);
    UIHelper.fadeIn(this);

    AudioManager.playBGM(this, false);

    // Update best score and add to history
    const isNewBest = updateBestScore(this.mode, this.score);
    addScoreToHistory(this.mode, this.score); // Always add to history
    const stats = getScoreStats(this.mode);
    const modeInfo = Object.values(MODES).find((m) => m.id === this.mode);

    this.add.text(GAME_WIDTH / 2, 60, '🎮 GAME OVER 🎮', {
      fontFamily: 'Orbitron',
      fontSize: '26px',
      color: COLORS.gold,
      fontStyle: 'bold',
    }).setOrigin(0.5).setShadow(0, 0, '#ffd700', 4, true, true);

    // Mode display
    this.add.text(GAME_WIDTH / 2, 105, `${modeInfo?.emoji} ${modeInfo?.name || this.mode}`, {
      fontFamily: 'Inter',
      fontSize: '14px',
      color: COLORS.textMuted,
    }).setOrigin(0.5);

    // Score display
    this.add.text(GAME_WIDTH / 2, 160, 'SCORE', {
      fontFamily: 'Orbitron',
      fontSize: '13px',
      color: COLORS.gold,
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, 195, String(this.score), {
      fontFamily: 'Orbitron',
      fontSize: '48px',
      color: isNewBest ? '#FFD700' : COLORS.silverLight,
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Best badge
    if (isNewBest) {
      this.add.text(GAME_WIDTH / 2, 250, '⭐ NEW PERSONAL BEST! ⭐', {
        fontFamily: 'Orbitron',
        fontSize: '12px',
        color: COLORS.gold,
        fontStyle: 'bold',
      }).setOrigin(0.5);
    }

    // Stats breakdown
    let statsY = isNewBest ? 280 : 260;

    this.add.text(GAME_WIDTH / 2, statsY, `Best: ${stats.best} | Avg: ${stats.average} | Plays: ${stats.count}`, {
      fontFamily: 'Inter',
      fontSize: '11px',
      color: COLORS.textMuted,
      align: 'center',
    }).setOrigin(0.5);

    // Quiz streak
    if (this.quizStreak > 0) {
      this.add.text(GAME_WIDTH / 2, statsY + 28, `🔥 Quiz Streak: ${this.quizStreak}`, {
        fontFamily: 'Inter',
        fontSize: '12px',
        color: '#FF6B6B',
        fontStyle: 'bold',
      }).setOrigin(0.5);
      statsY += 35;
    }

    // Leaderboard submit status
    if (isFirebaseConfigured() && this.player) {
      this.add.text(GAME_WIDTH / 2, statsY + 30, '📤 Submitting to leaderboard...', {
        fontFamily: 'Inter',
        fontSize: '10px',
        color: COLORS.textMuted,
      }).setOrigin(0.5);

      saveLeaderboardScore({
        playerName: this.player.name,
        department: this.player.department,
        year: this.player.year,
        role: this.player.role,
        score: this.score,
        mode: this.mode,
        timestamp: new Date().toISOString(),
      }).catch((err) => {
        console.error('Leaderboard submission failed:', err);
      });
    }

    // Buttons
    const buttonY = GAME_HEIGHT - 120;

    UIHelper.createButton(this, GAME_WIDTH / 2 - 110, buttonY, '🔄 REPLAY', () => {
      UIHelper.goToScene(this, 'GameScene', { mode: this.mode });
    }, { width: 180, height: 48, fontSize: '14px' });

    UIHelper.createButton(this, GAME_WIDTH / 2 + 110, buttonY, '🏠 MENU', () => {
      UIHelper.goToScene(this, 'MenuScene');
    }, { width: 180, height: 48, fontSize: '14px' });

    UIHelper.createButton(this, GAME_WIDTH / 2, GAME_HEIGHT - 50, '← MODES', () => {
      UIHelper.goToScene(this, 'ModeScene');
    }, { width: 160, height: 44, fontSize: '13px' });
  }
}
