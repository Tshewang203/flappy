import { GAME_WIDTH, GAME_HEIGHT, COLORS, MODES, DEPARTMENTS, ROLES } from '../config/constants.js';
import { getPlayer } from '../utils/storage.js';
import { getLeaderboard, isFirebaseConfigured } from '../firebase.js';
import { UIHelper } from '../utils/UIHelper.js';

/**
 * LeaderboardScene — Mode-aware leaderboards with department/role filtering.
 * Fixed UI layout and column alignment.
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
        fontSize: '20px',
        color: COLORS.gold,
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(5)
      .setShadow(0, 0, '#ffd700', 4, true, true);

    this.add
      .text(GAME_WIDTH / 2, 118, 'Top 10 Performers', {
        fontFamily: 'Inter',
        fontSize: '11px',
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
      .text(GAME_WIDTH / 2, 155, '', {
        fontFamily: 'Orbitron',
        fontSize: '12px',
        color: COLORS.gold,
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(5);

    // Scrollable entries area
    this.entriesContainer = this.add.container(GAME_WIDTH / 2, 320);
    this.statusText = this.add
      .text(GAME_WIDTH / 2, 320, 'Loading...', {
        fontFamily: 'Inter',
        fontSize: '13px',
        color: COLORS.textMuted,
        align: 'center',
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
    const tabW = (GAME_WIDTH - 40) / 3;
    const startX = 20 + tabW / 2;
    const y = 130;

    this.tabBgs = [];

    modes.forEach((mode, idx) => {
      const x = startX + idx * tabW;
      const isActive = mode.id === this.selectedModeId;

      const bg = this.add
        .rectangle(x, y, tabW - 8, 36, 0xffffff, isActive ? 0.3 : 0.08)
        .setStrokeStyle(2, isActive ? COLORS.gold : COLORS.silver, isActive ? 0.9 : 0.2)
        .setInteractive({ useHandCursor: true })
        .setDepth(5);

      const shortName = mode.emoji + ' ' + mode.name.split(' ')[0];
      this.add
        .text(x, y, shortName, {
          fontFamily: 'Inter',
          fontSize: '10px',
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
      this.deptLabel.setText(
        player?.role === ROLES.LECTURER
          ? '👨‍🏫 Lecturer Rankings'
          : `🎓 ${dept} Students`
      );

      // Dept cycle arrows for students view
      if (player?.role !== ROLES.LECTURER) {
        this.add
          .text(40, 155, '◀', { fontSize: '14px', color: COLORS.gold, fontStyle: 'bold' })
          .setOrigin(0.5)
          .setInteractive({ useHandCursor: true })
          .setDepth(5)
          .on('pointerdown', () => {
            const next = (this.selectedDeptIndex - 1 + DEPARTMENTS.length) % DEPARTMENTS.length;
            this.scene.restart({ modeId: this.selectedModeId, deptIndex: next });
          });

        this.add
          .text(GAME_WIDTH - 40, 155, '▶', { fontSize: '14px', color: COLORS.gold, fontStyle: 'bold' })
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

    // Draw header with fixed layout
    const headerY = -140;
    const rowHeight = 38;
    const contentWidth = GAME_WIDTH - 60;

    // Header background
    this.entriesContainer.add(
      this.add
        .rectangle(0, headerY, contentWidth, 34, 0xffd700, 0.15)
        .setStrokeStyle(2, COLORS.gold, 0.6)
    );

    // Header columns: Rank | Name | Dept | Year | Score
    const headers = [
      { label: 'Rank', x: -contentWidth / 2 + 25, align: 0.5, w: 45 },
      { label: 'Player', x: -contentWidth / 2 + 75, align: 0, w: 100 },
      { label: 'Dept', x: 20, align: 0.5, w: 75 },
      { label: 'Year', x: 90, align: 0.5, w: 70 },
      { label: 'Score', x: contentWidth / 2 - 25, align: 1, w: 50 },
    ];

    headers.forEach((h) => {
      this.entriesContainer.add(
        this.add
          .text(h.x, headerY, h.label, {
            fontFamily: 'Orbitron',
            fontSize: '10px',
            color: COLORS.gold,
            fontStyle: 'bold',
          })
          .setOrigin(h.align, 0.5)
      );
    });

    // Render entries with proper alignment
    entries.forEach((entry, idx) => {
      const rowY = headerY + 40 + idx * rowHeight;

      // Row background
      const bgAlpha = idx % 2 === 0 ? 0.06 : 0.02;
      this.entriesContainer.add(
        this.add
          .rectangle(0, rowY, contentWidth, rowHeight - 2, 0xffffff, bgAlpha)
          .setStrokeStyle(1, COLORS.gold, 0.08)
      );

      // Rank with medals
      const medalEmojis = ['🥇', '🥈', '🥉'];
      const rankText = idx < 3 ? medalEmojis[idx] : `#${idx + 1}`;
      const rankColor = idx === 0 ? '#FFD700' : idx === 1 ? '#C0C0C0' : idx === 2 ? '#CD7F32' : COLORS.gold;

      this.entriesContainer.add(
        this.add.text(-contentWidth / 2 + 25, rowY, rankText, {
          fontFamily: 'Orbitron',
          fontSize: idx < 3 ? '14px' : '11px',
          color: rankColor,
          fontStyle: 'bold',
        }).setOrigin(0.5, 0.5)
      );

      // Player name (truncate if needed)
      const playerName = (entry.name || 'Anonymous').substring(0, 13);
      this.entriesContainer.add(
        this.add.text(-contentWidth / 2 + 75, rowY, playerName, {
          fontFamily: 'Inter',
          fontSize: '10px',
          color: idx < 3 ? COLORS.silverLight : COLORS.text,
          fontStyle: idx < 3 ? 'bold' : 'normal',
        }).setOrigin(0, 0.5)
      );

      // Department (truncate)
      const deptShort = (entry.department || '—').substring(0, 6);
      this.entriesContainer.add(
        this.add.text(20, rowY, deptShort, {
          fontFamily: 'Inter',
          fontSize: '9px',
          color: COLORS.textMuted,
        }).setOrigin(0.5, 0.5)
      );

      // Year
      this.entriesContainer.add(
        this.add.text(90, rowY, entry.year || '—', {
          fontFamily: 'Inter',
          fontSize: '9px',
          color: COLORS.textMuted,
        }).setOrigin(0.5, 0.5)
      );

      // Score
      this.entriesContainer.add(
        this.add.text(contentWidth / 2 - 25, rowY, String(entry.score), {
          fontFamily: 'Orbitron',
          fontSize: '11px',
          color: idx < 3 ? COLORS.gold : COLORS.silverLight,
          fontStyle: idx < 3 ? 'bold' : 'normal',
        }).setOrigin(1, 0.5)
      );
    });

    // Footer line
    this.entriesContainer.add(
      this.add
        .rectangle(
          0,
          headerY + 40 + entries.length * rowHeight + 4,
          contentWidth,
          1,
          COLORS.gold,
          0.4
        )
    );
  }
}
