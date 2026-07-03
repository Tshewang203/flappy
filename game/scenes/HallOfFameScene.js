import { GAME_WIDTH, GAME_HEIGHT, COLORS, MODES, DEPARTMENTS, ROLES } from '../config/constants.js';
import { getPlayer, getBestScores } from '../utils/storage.js';
import { getUnlockedAchievements, ACHIEVEMENTS } from '../utils/achievements.js';
import { getLeaderboard, isFirebaseConfigured } from '../firebase.js';
import { UIHelper } from '../utils/UIHelper.js';

/**
 * HallOfFameScene — Top players, department heroes, lecturers, rising stars.
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
    this.add.image(GAME_WIDTH / 2, 50, logoKey).setDisplaySize(55, 55);

    this.add.text(GAME_WIDTH / 2, 95, '🏛️ HALL OF FAME', {
      fontFamily: 'Orbitron', fontSize: '22px', color: COLORS.gold, fontStyle: 'bold',
    }).setOrigin(0.5).setShadow(0, 0, '#ffd700', 6, true, true);

    this.add.text(GAME_WIDTH / 2, 125, 'CST Silver Jubilee Legends', {
      fontFamily: 'Inter', fontSize: '13px', color: COLORS.textMuted,
    }).setOrigin(0.5);

    this.contentY = 155;
    this.loadHallOfFame();

    // Achievements row
    const unlocked = getUnlockedAchievements();
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 130, '🏅 Your Badges', {
      fontFamily: 'Orbitron', fontSize: '14px', color: COLORS.silver,
    }).setOrigin(0.5);

    const badgeText = unlocked.length > 0
      ? unlocked.map((id) => ACHIEVEMENTS[id]?.emoji || '🏅').join(' ')
      : 'Play to earn badges!';
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 105, badgeText, {
      fontFamily: 'Inter', fontSize: unlocked.length > 0 ? '22px' : '14px', color: COLORS.textMuted,
    }).setOrigin(0.5);

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
      this.addSectionTitle(y, '⭐ Your Best Run');
      y += 28;
      this.addGlowEntry(y, `${modeInfo?.emoji || ''} ${modeInfo?.name || topLocal[0]}`, `Score: ${topLocal[1]}`);
      y += 40;
    }

    if (!isFirebaseConfigured()) {
      this.add.text(GAME_WIDTH / 2, y + 20, 'Connect Firebase for\nlive Hall of Fame data', {
        fontFamily: 'Inter', fontSize: '12px', color: COLORS.textMuted, align: 'center',
      }).setOrigin(0.5);
      return;
    }

    this.statusText = this.add.text(GAME_WIDTH / 2, y, 'Loading legends...', {
      fontFamily: 'Inter', fontSize: '12px', color: COLORS.textMuted,
    }).setOrigin(0.5);

    const [global, lecturers, deptBoard] = await Promise.all([
      getLeaderboard({ modeId: 'flappy_cst', topN: 1 }),
      getLeaderboard({ modeId: 'department', role: ROLES.LECTURER, topN: 1 }),
      player?.department
        ? getLeaderboard({ modeId: 'department', department: player.department, role: ROLES.STUDENT, topN: 1 })
        : Promise.resolve([]),
    ]);

    // Rising star — 1st year top from global entries
    const allGlobal = await getLeaderboard({ modeId: 'journey', topN: 20 });
    const risingStar = allGlobal.find((e) => e.year === '1st Year');

    this.statusText.destroy();
    y = this.contentY;

    if (global[0]) {
      this.addSectionTitle(y, '🏆 Overall Champion');
      y += 28;
      this.addGlowEntry(y, global[0].name, `${global[0].department} · ${global[0].score} pts`);
      y += 45;
    }

    if (deptBoard[0]) {
      this.addSectionTitle(y, `🎓 ${player?.department || 'Department'} Hero`);
      y += 28;
      this.addGlowEntry(y, deptBoard[0].name, `${deptBoard[0].year} · ${deptBoard[0].score} pts`);
      y += 45;
    }

    if (lecturers[0]) {
      this.addSectionTitle(y, '👨‍🏫 Top Lecturer');
      y += 28;
      this.addGlowEntry(y, lecturers[0].name, `${lecturers[0].department} · ${lecturers[0].score} pts`);
      y += 45;
    }

    if (risingStar) {
      this.addSectionTitle(y, '🌟 Rising Star (1st Year)');
      y += 28;
      this.addGlowEntry(y, risingStar.name, `${risingStar.department} · ${risingStar.score} pts`);
    }
  }

  addSectionTitle(y, text) {
    this.add.text(GAME_WIDTH / 2, y, text, {
      fontFamily: 'Orbitron', fontSize: '15px', color: COLORS.gold, fontStyle: 'bold',
    }).setOrigin(0.5);
  }

  addGlowEntry(y, name, detail) {
    const bg = this.add.rectangle(GAME_WIDTH / 2, y, GAME_WIDTH - 50, 36, 0xffffff, 0.12)
      .setStrokeStyle(1, 0xffd700, 0.35);
    this.add.text(GAME_WIDTH / 2, y - 8, name, {
      fontFamily: 'Orbitron', fontSize: '16px', color: COLORS.white, fontStyle: 'bold',
    }).setOrigin(0.5).setShadow(0, 0, '#ffd700', 4, true, true);
    this.add.text(GAME_WIDTH / 2, y + 10, detail, {
      fontFamily: 'Inter', fontSize: '13px', color: COLORS.textMuted,
    }).setOrigin(0.5);
    this.tweens.add({ targets: bg, alpha: { from: 0.12, to: 0.22 }, duration: 1500, yoyo: true, repeat: -1 });
  }
}
