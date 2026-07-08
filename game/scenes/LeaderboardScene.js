import { GAME_WIDTH, GAME_HEIGHT, COLORS, MODES, DEPARTMENTS, ROLES } from '../config/constants.js';
import { getPlayer } from '../utils/storage.js';
import { getLeaderboard, isFirebaseConfigured } from '../firebase.js';
import { UIHelper } from '../utils/UIHelper.js';

/**
 * LeaderboardScene — Mode-aware leaderboards with department/role filtering.
 */
export class LeaderboardScene extends Phaser.Scene {
  constructor() {
    super({ key: 'LeaderboardScene' });
  }

  init(data) {
    this.initialModeId = data?.modeId || 'flappy_cst';
    this.initialDeptIndex = data?.deptIndex ?? null;
  }

  create() {
    this._navigating = false;
    UIHelper.setVideoBackground(this);
    UIHelper.createGlassOverlay(this, 0.15);
    UIHelper.fadeIn(this);

    const logoKey = this.textures.exists('cst_logo') ? 'cst_logo' : 'logo';
    this.add.image(GAME_WIDTH / 2, 55, logoKey).setDisplaySize(70, 70);

    this.add
      .text(GAME_WIDTH / 2, 105, '🏆 LEADERBOARD', {
        fontFamily: 'Orbitron',
        fontSize: '24px',
        color: COLORS.gold,
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(5);

    this.selectedModeId = this.initialModeId;
    this.createModeTabs();

    const player = getPlayer();
    if (this.initialDeptIndex !== null) {
      this.selectedDeptIndex = this.initialDeptIndex;
    } else if (player?.department) {
      const idx = DEPARTMENTS.indexOf(player.department);
      this.selectedDeptIndex = idx >= 0 ? idx : 0;
    } else {
      this.selectedDeptIndex = 0;
    }

    this.deptLabel = this.add
      .text(GAME_WIDTH / 2, 175, '', {
        fontFamily: 'Inter',
        fontSize: '14px',
        color: COLORS.gold,
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(5);

    // Entries container
    this.entriesContainer = this.add.container(GAME_WIDTH / 2, 300);
    this.statusText = this.add
      .text(GAME_WIDTH / 2, 300, 'Loading...', {
        fontFamily: 'Inter',
        fontSize: '15px',
        color: COLORS.textMuted,
      })
      .setOrigin(0.5)
      .setDepth(5);

    this.loadEntries();

    UIHelper.createButton(
      this,
      GAME_WIDTH / 2,
      GAME_HEIGHT - 55,
      '←  BACK',
      () => UIHelper.goToScene(this, 'MenuScene'),
      { width: 160, height: 44, fontSize: '14px' }
    );
  }

  createModeTabs() {
    const modes = [MODES.FLAPPY_CST, MODES.JOURNEY, MODES.DEPARTMENT];
    const tabW = (GAME_WIDTH - 50) / 3;
    const startX = 25 + tabW / 2;
    const y = 140;

    this.tabBgs = [];

    modes.forEach((mode, idx) => {
      const x = startX + idx * tabW;
      const isActive = mode.id === this.selectedModeId;

      const bg = this.add
        .rectangle(x, y, tabW - 6, 40, 0xffffff, isActive ? 0.25 : 0.12)
        .setStrokeStyle(2, isActive ? COLORS.gold : COLORS.silver, isActive ? 0.8 : 0.4)
        .setInteractive({ useHandCursor: true })
        .setDepth(5);

      const shortName = mode.emoji + ' ' + mode.name.split(' ')[0];
      this.add
        .text(x, y, shortName, {
          fontFamily: 'Inter',
          fontSize: '13px',
          fontStyle: isActive ? 'bold' : 'normal',
          color: isActive ? COLORS.gold : COLORS.textMuted,
        })
        .setOrigin(0.5)
        .setDepth(6);

      bg.on('pointerdown', () => {
        this.selectedModeId = mode.id;
        this.scene.restart({ modeId: mode.id });
      });

      this.tabBgs.push(bg);
    });
  }

  async loadEntries() {
    this.entriesContainer.removeAll(true);
    this.statusText.setVisible(true);
    this.statusText.setText('Loading...');

    const modeInfo = Object.values(MODES).find((m) => m.id === this.selectedModeId);
    const player = getPlayer();

    // Update department label
    if (this.selectedModeId === 'department') {
      const dept = DEPARTMENTS[this.selectedDeptIndex];
      const role = player?.role === ROLES.LECTURER ? 'Lecturers' : DEPARTMENTS[this.selectedDeptIndex];
      this.deptLabel.setText(
        player?.role === ROLES.LECTURER
          ? '👨‍🏫 Lecturer Leaderboard'
          : `🎓 ${dept} Students`
      );

      // Dept cycle arrows for students view
      if (player?.role !== ROLES.LECTURER) {
        this.add
          .text(60, 175, '◀', { fontSize: '18px', color: COLORS.gold, fontStyle: 'bold' })
          .setOrigin(0.5)
          .setInteractive({ useHandCursor: true })
          .setDepth(5)
          .on('pointerdown', () => {
            const next = (this.selectedDeptIndex - 1 + DEPARTMENTS.length) % DEPARTMENTS.length;
            this.scene.restart({ modeId: this.selectedModeId, deptIndex: next });
          });

        this.add
          .text(GAME_WIDTH - 60, 175, '▶', { fontSize: '18px', color: COLORS.gold, fontStyle: 'bold' })
          .setOrigin(0.5)
          .setInteractive({ useHandCursor: true })
          .setDepth(5)
          .on('pointerdown', () => {
            const next = (this.selectedDeptIndex + 1) % DEPARTMENTS.length;
            this.scene.restart({ modeId: this.selectedModeId, deptIndex: next });
          });
      }
    } else {
      this.deptLabel.setText('🌍 Global Leaderboard');
    }

    if (!isFirebaseConfigured()) {
      this.statusText.setText('Firebase not configured.\nAdd credentials in firebase.js');
      return;
    }

    const filters = { modeId: this.selectedModeId, topN: 10 };

    if (this.selectedModeId === 'department') {
      if (player?.role === ROLES.LECTURER) {
        filters.role = ROLES.LECTURER;
      } else {
        filters.department = DEPARTMENTS[this.selectedDeptIndex];
        filters.role = ROLES.STUDENT;
      }
    }

    const entries = await getLeaderboard(filters);
    this.statusText.setVisible(false);

    if (entries.length === 0) {
      this.statusText.setVisible(true);
      this.statusText.setText('No scores yet.\nBe the first to play!');
      return;
    }

    // Header section with better styling
    const headerY = -160;
    const cols = [-155, -40, 60, 155];
    const headerLabels = ['Rank', 'Name', 'Dept', 'Year', 'Score'];
    
    // Draw header background
    this.entriesContainer.add(
      this.add
        .rectangle(GAME_WIDTH / 2, headerY, GAME_WIDTH - 40, 36, 0xffffff, 0.08)
        .setStrokeStyle(1, COLORS.gold, 0.4)
    );

    // Header text
    [
      { label: 'Rank', x: -185 },
      { label: 'Name', x: -155 },
      { label: 'Dept', x: -40 },
      { label: 'Year', x: 60 },
      { label: 'Score', x: 155 },
    ].forEach((h) => {
      this.entriesContainer.add(
        this.add
          .text(h.x, headerY, h.label, {
            fontFamily: 'Orbitron',
            fontSize: '12px',
            color: COLORS.gold,
            fontStyle: 'bold',
          })
          .setOrigin(h.label === 'Score' ? 1 : 0, 0.5)
      );
    });

    // Entries with alternating background
    entries.forEach((entry, idx) => {
      const rowY = headerY + 38 + idx * 40;
      
      // Alternating row backgrounds
      if (idx % 2 === 0) {
        this.entriesContainer.add(
          this.add
            .rectangle(GAME_WIDTH / 2, rowY, GAME_WIDTH - 40, 38, 0xffffff, 0.04)
        );
      }

      const rankColor = idx === 0 ? '#FFD700' : idx === 1 ? '#C0C0C0' : idx === 2 ? '#CD7F32' : COLORS.gold;
      const rankText = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}.`;

      this.entriesContainer.add(
        this.add.text(-185, rowY, rankText, {
          fontFamily: 'Orbitron',
          fontSize: idx < 3 ? '16px' : '13px',
          color: rankColor,
          fontStyle: 'bold',
        }).setOrigin(0, 0.5)
      );

      const deptShort = entry.department?.length > 10
        ? entry.department.substring(0, 9) + '…'
        : entry.department || '-';

      [
        { t: entry.name || '-', x: -155 },
        { t: deptShort, x: -40 },
        { t: entry.year || '-', x: 60 },
        { t: String(entry.score), x: 155 },
      ].forEach((col, i) => {
        this.entriesContainer.add(
          this.add.text(col.x, rowY, col.t, {
            fontFamily: 'Inter',
            fontSize: '13px',
            color: idx < 3 ? COLORS.silverLight : COLORS.text,
            fontStyle: idx < 3 ? 'bold' : 'normal',
          }).setOrigin(i === 3 ? 1 : 0, 0.5)
        );
      });
    });

    // Bottom accent line
    this.entriesContainer.add(
      this.add
        .rectangle(GAME_WIDTH / 2, headerY + 38 + entries.length * 40 + 8, GAME_WIDTH - 40, 1, COLORS.gold, 0.3)
    );
  }
}
