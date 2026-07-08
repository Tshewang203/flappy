import { GAME_WIDTH, GAME_HEIGHT, COLORS, MODES, DEPARTMENTS, ROLES } from '../config/constants.js';
import { getPlayer } from '../utils/storage.js';
import { getLeaderboard, isFirebaseConfigured } from '../firebase.js';
import { UIHelper } from '../utils/UIHelper.js';

/**
 * LeaderboardScene — Mode-aware leaderboards with department/role filtering.
 * Enhanced with better styling and visual hierarchy.
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
    this.add.image(GAME_WIDTH / 2, 45, logoKey).setDisplaySize(50, 50);

    this.add
      .text(GAME_WIDTH / 2, 95, '🏆 LEADERBOARD 🏆', {
        fontFamily: 'Orbitron',
        fontSize: '22px',
        color: COLORS.gold,
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(5)
      .setShadow(0, 0, '#ffd700', 4, true, true);

    this.add
      .text(GAME_WIDTH / 2, 120, 'Top Performers', {
        fontFamily: 'Inter',
        fontSize: '12px',
        color: COLORS.textMuted,
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
      .text(GAME_WIDTH / 2, 165, '', {
        fontFamily: 'Orbitron',
        fontSize: '13px',
        color: COLORS.gold,
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(5);

    // Entries container
    this.entriesContainer = this.add.container(GAME_WIDTH / 2, 340);
    this.statusText = this.add
      .text(GAME_WIDTH / 2, 300, 'Loading...', {
        fontFamily: 'Inter',
        fontSize: '14px',
        color: COLORS.textMuted,
      })
      .setOrigin(0.5)
      .setDepth(5);

    this.loadEntries();

    UIHelper.createButton(
      this,
      GAME_WIDTH / 2,
      GAME_HEIGHT - 50,
      '←  BACK',
      () => UIHelper.goToScene(this, 'MenuScene'),
      { width: 160, height: 44, fontSize: '14px' }
    );
  }

  createModeTabs() {
    const modes = [MODES.FLAPPY_CST, MODES.JOURNEY, MODES.DEPARTMENT];
    const tabW = (GAME_WIDTH - 50) / 3;
    const startX = 25 + tabW / 2;
    const y = 135;

    this.tabBgs = [];

    modes.forEach((mode, idx) => {
      const x = startX + idx * tabW;
      const isActive = mode.id === this.selectedModeId;

      const bg = this.add
        .rectangle(x, y, tabW - 6, 38, 0xffffff, isActive ? 0.3 : 0.1)
        .setStrokeStyle(2, isActive ? COLORS.gold : COLORS.silver, isActive ? 0.9 : 0.3)
        .setInteractive({ useHandCursor: true })
        .setDepth(5);

      const shortName = mode.emoji + '\n' + mode.name.split(' ')[0];
      this.add
        .text(x, y, shortName, {
          fontFamily: 'Inter',
          fontSize: '11px',
          fontStyle: isActive ? 'bold' : 'normal',
          color: isActive ? COLORS.gold : COLORS.textMuted,
          align: 'center',
        })
        .setOrigin(0.5)
        .setDepth(6)
        .setLineSpacing(2);

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
          .text(45, 165, '◀', { fontSize: '16px', color: COLORS.gold, fontStyle: 'bold' })
          .setOrigin(0.5)
          .setInteractive({ useHandCursor: true })
          .setDepth(5)
          .on('pointerdown', () => {
            const next = (this.selectedDeptIndex - 1 + DEPARTMENTS.length) % DEPARTMENTS.length;
            this.scene.restart({ modeId: this.selectedModeId, deptIndex: next });
          });

        this.add
          .text(GAME_WIDTH - 45, 165, '▶', { fontSize: '16px', color: COLORS.gold, fontStyle: 'bold' })
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

    // Enhanced header section
    const headerY = -180;
    const headerHeight = 40;

    // Header background with gradient effect
    this.entriesContainer.add(
      this.add
        .rectangle(GAME_WIDTH / 2, headerY, GAME_WIDTH - 40, headerHeight, 0xffd700, 0.15)
        .setStrokeStyle(2, COLORS.gold, 0.6)
    );

    // Header columns
    const headerCols = [
      { label: 'Rank', x: -185, align: 0 },
      { label: 'Player', x: -110, align: 0 },
      { label: 'Dept', x: 10, align: 0.5 },
      { label: 'Year', x: 75, align: 0 },
      { label: 'Score', x: 165, align: 1 },
    ];

    headerCols.forEach((h) => {
      this.entriesContainer.add(
        this.add
          .text(h.x, headerY, h.label, {
            fontFamily: 'Orbitron',
            fontSize: '11px',
            color: COLORS.gold,
            fontStyle: 'bold',
          })
          .setOrigin(h.align, 0.5)
      );
    });

    // Entries with enhanced styling
    entries.forEach((entry, idx) => {
      const rowY = headerY + headerHeight + 6 + idx * 42;

      // Row background with alternating colors
      const bgColor = idx % 2 === 0 ? 0xffffff : 0xf5f5f5;
      const bgAlpha = idx % 2 === 0 ? 0.04 : 0.02;

      this.entriesContainer.add(
        this.add
          .rectangle(GAME_WIDTH / 2, rowY, GAME_WIDTH - 40, 40, bgColor, bgAlpha)
          .setStrokeStyle(1, COLORS.gold, 0.1)
      );

      // Medal ranks with emoji
      const rankEmojis = ['🥇', '🥈', '🥉'];
      const rankText = idx < 3 ? rankEmojis[idx] : `#${idx + 1}`;
      const rankColor = idx === 0 ? '#FFD700' : idx === 1 ? '#C0C0C0' : idx === 2 ? '#CD7F32' : COLORS.gold;

      this.entriesContainer.add(
        this.add.text(-185, rowY, rankText, {
          fontFamily: 'Orbitron',
          fontSize: idx < 3 ? '18px' : '12px',
          color: rankColor,
          fontStyle: 'bold',
        }).setOrigin(0, 0.5)
      );

      // Player name with truncation
      const playerName = entry.name?.length > 12 
        ? entry.name.substring(0, 11) + '…' 
        : entry.name || 'Anonymous';
      
      this.entriesContainer.add(
        this.add.text(-110, rowY, playerName, {
          fontFamily: 'Inter',
          fontSize: '12px',
          color: idx < 3 ? COLORS.silverLight : COLORS.text,
          fontStyle: idx < 3 ? 'bold' : 'normal',
        }).setOrigin(0, 0.5)
      );

      // Department (abbreviated)
      const deptShort = entry.department?.length > 8
        ? entry.department.substring(0, 7) + '…'
        : entry.department || '—';

      this.entriesContainer.add(
        this.add.text(10, rowY, deptShort, {
          fontFamily: 'Inter',
          fontSize: '11px',
          color: COLORS.textMuted,
        }).setOrigin(0.5, 0.5)
      );

      // Year
      this.entriesContainer.add(
        this.add.text(75, rowY, entry.year || '—', {
          fontFamily: 'Inter',
          fontSize: '11px',
          color: COLORS.textMuted,
        }).setOrigin(0, 0.5)
      );

      // Score (right-aligned with bold for top 3)
      this.entriesContainer.add(
        this.add.text(165, rowY, String(entry.score), {
          fontFamily: 'Orbitron',
          fontSize: '13px',
          color: idx < 3 ? COLORS.gold : COLORS.silverLight,
          fontStyle: idx < 3 ? 'bold' : 'normal',
        }).setOrigin(1, 0.5)
      );
    });

    // Footer line
    this.entriesContainer.add(
      this.add
        .rectangle(GAME_WIDTH / 2, headerY + headerHeight + 6 + entries.length * 42 + 8, GAME_WIDTH - 40, 1, COLORS.gold, 0.4)
    );
  }
}
