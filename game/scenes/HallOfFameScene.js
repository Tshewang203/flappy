import { GAME_WIDTH, GAME_HEIGHT, COLORS, MODES, ROLES } from '../config/constants.js';
import { getPlayer, getBestScores, getUnlockedAchievements } from '../utils/storage.js';
import { ACHIEVEMENTS } from '../utils/achievements.js';
import { getLeaderboard, isFirebaseConfigured } from '../firebase.js';
import { UIHelper } from '../utils/UIHelper.js';

/**
 * HallOfFameScene — Top players, department heroes, lecturers, rising stars.
 * Enhanced with better styling and visual hierarchy.
 */
export class HallOfFameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'HallOfFameScene' });
  }

  create() {
    this._navigating = false;
    UIHelper.setVideoBackground(this);
    UIHelper.createGlassOverlay(this, 0.15);
    UIHelper.fadeIn(this);

    const logoKey = this.textures.exists('cst_logo') ? 'cst_logo' : 'logo';
    this.add.image(GAME_WIDTH / 2, 45, logoKey).setDisplaySize(50, 50);

    this.add.text(GAME_WIDTH / 2, 95, '🏛️ HALL OF FAME 🏛️', {
      fontFamily: 'Orbitron',
      fontSize: '22px',
      color: COLORS.gold,
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(5).setShadow(0, 0, '#ffd700', 4, true, true);

    this.add.text(GAME_WIDTH / 2, 120, 'CST Silver Jubilee Legends', {
      fontFamily: 'Inter',
      fontSize: '12px',
      color: COLORS.textMuted,
    }).setOrigin(0.5).setDepth(5);

    this.contentY = 155;
    this.loadHallOfFame();

    // Achievements section
    const unlocked = getUnlockedAchievements();
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 150, '🏅 YOUR ACHIEVEMENTS', {
      fontFamily: 'Orbitron',
      fontSize: '12px',
      color: COLORS.gold,
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(5);

    const badgeText = unlocked.length > 0
      ? unlocked.map((id) => ACHIEVEMENTS[id]?.emoji || '🏅').join('  ')
      : '🎮 Play to earn badges!';

    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 120, badgeText, {
      fontFamily: 'Inter',
      fontSize: unlocked.length > 0 ? '20px' : '12px',
      color: unlocked.length > 0 ? COLORS.gold : COLORS.textMuted,
      align: 'center',
    }).setOrigin(0.5).setDepth(5);

    UIHelper.createButton(this, GAME_WIDTH / 2, GAME_HEIGHT - 50, '←  BACK', () => {
      UIHelper.goToScene(this, 'MenuScene');
    }, { width: 160, height: 44, fontSize: '14px', navigate: true });
  }

  async loadHallOfFame() {
    const player = getPlayer();
    const bests = getBestScores();
    let y = this.contentY;

    // Local bests showcase
    const topLocal = Object.entries(bests).sort((a, b) => b[1] - a[1])[0];
    if (topLocal) {
      const modeInfo = Object.values(MODES).find((m) => m.id === topLocal[0]);
      
      // Section header
      this.addSectionHeader(y, '⭐ YOUR PERSONAL BEST');
      y += 28;

      // Best score card
      const cardBg = this.add.rectangle(GAME_WIDTH / 2, y + 18, GAME_WIDTH - 40, 50, 0xffd700, 0.12)
        .setStrokeStyle(2, COLORS.gold, 0.5).setDepth(5);
      
      this.add.text(GAME_WIDTH / 2 - 70, y + 10, modeInfo?.emoji || '🎮', {
        fontSize: '24px',
      }).setOrigin(0.5, 0.5).setDepth(6);

      this.add.text(GAME_WIDTH / 2 - 30, y + 5, modeInfo?.name || topLocal[0], {
        fontFamily: 'Orbitron',
        fontSize: '13px',
        color: COLORS.gold,
        fontStyle: 'bold',
      }).setOrigin(0, 0.5).setDepth(6);

      this.add.text(GAME_WIDTH / 2 + 60, y + 15, `${topLocal[1]}`, {
        fontFamily: 'Orbitron',
        fontSize: '16px',
        color: COLORS.gold,
        fontStyle: 'bold',
      }).setOrigin(1, 0.5).setDepth(6);

      y += 60;
    }

    if (!isFirebaseConfigured()) {
      this.addSectionHeader(y, '🌐 GLOBAL HALL');
      y += 28;
      this.add.text(GAME_WIDTH / 2, y, 'Firebase not configured.\nAdd credentials to enable live rankings', {
        fontFamily: 'Inter',
        fontSize: '12px',
        color: COLORS.textMuted,
        align: 'center',
      }).setOrigin(0.5).setDepth(5);
      return;
    }

    // Global leaderboard
    this.addSectionHeader(y, '🌍 GLOBAL TOP 5');
    y += 28;

    const globalEntries = await getLeaderboard({ modeId: 'flappy_cst', topN: 5 });
    if (globalEntries.length > 0) {
      globalEntries.forEach((entry, idx) => {
        const medal = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'][idx];
        const color = idx < 3 ? COLORS.gold : COLORS.textMuted;

        this.add.text(GAME_WIDTH / 2 - 100, y + idx * 28, `${medal} ${entry.name || 'Anonymous'}`, {
          fontFamily: 'Inter',
          fontSize: '12px',
          color,
          fontStyle: idx < 3 ? 'bold' : 'normal',
        }).setOrigin(0, 0.5).setDepth(5);

        this.add.text(GAME_WIDTH / 2 + 100, y + idx * 28, `${entry.score}`, {
          fontFamily: 'Orbitron',
          fontSize: '12px',
          color,
          fontStyle: idx < 3 ? 'bold' : 'normal',
        }).setOrigin(1, 0.5).setDepth(5);
      });
      y += globalEntries.length * 28 + 10;
    }

    // Department heroes (if student)
    if (player?.role !== ROLES.LECTURER && player?.department) {
      y += 15;
      this.addSectionHeader(y, `🎯 ${player.department.toUpperCase()} HEROES`);
      y += 28;

      const deptEntries = await getLeaderboard({
        modeId: 'department',
        department: player.department,
        role: ROLES.STUDENT,
        topN: 5,
      });

      if (deptEntries.length > 0) {
        deptEntries.forEach((entry, idx) => {
          const medal = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'][idx];
          const color = idx < 3 ? COLORS.gold : COLORS.textMuted;

          this.add.text(GAME_WIDTH / 2 - 100, y + idx * 28, `${medal} ${entry.name || 'Anonymous'}`, {
            fontFamily: 'Inter',
            fontSize: '12px',
            color,
            fontStyle: idx < 3 ? 'bold' : 'normal',
          }).setOrigin(0, 0.5).setDepth(5);

          this.add.text(GAME_WIDTH / 2 + 100, y + idx * 28, `${entry.score}`, {
            fontFamily: 'Orbitron',
            fontSize: '12px',
            color,
            fontStyle: idx < 3 ? 'bold' : 'normal',
          }).setOrigin(1, 0.5).setDepth(5);
        });
      }
    }
  }

  addSectionHeader(y, text) {
    const headerBg = this.add.rectangle(GAME_WIDTH / 2, y, GAME_WIDTH - 40, 24, 0xffffff, 0.08)
      .setStrokeStyle(1, COLORS.gold, 0.3).setDepth(5);

    this.add.text(GAME_WIDTH / 2, y, text, {
      fontFamily: 'Orbitron',
      fontSize: '12px',
      color: COLORS.gold,
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(6);
  }

  addGlowEntry(y, title, subtitle) {
    this.add.text(GAME_WIDTH / 2 - 80, y, title, {
      fontFamily: 'Inter',
      fontSize: '13px',
      color: COLORS.silverLight,
      fontStyle: 'bold',
    }).setOrigin(0, 0.5).setDepth(5);

    this.add.text(GAME_WIDTH / 2 + 80, y, subtitle, {
      fontFamily: 'Orbitron',
      fontSize: '13px',
      color: COLORS.gold,
      fontStyle: 'bold',
    }).setOrigin(1, 0.5).setDepth(5);
  }
}
