import { GAME_WIDTH, GAME_HEIGHT, COLORS, MODES, DEPARTMENTS, ROLES } from '../config/constants.js';
import { getPlayer, getBestScores, getUnlockedAchievements } from '../utils/storage.js';
import { ACHIEVEMENTS } from '../utils/achievements.js';
import { getLeaderboard, isFirebaseConfigured } from '../firebase.js';
import { UIHelper } from '../utils/UIHelper.js';

// Shared horizontal layout — every section aligns to this margin/width so columns line up.
const MARGIN = 20;
const CONTENT_W = GAME_WIDTH - MARGIN * 2;
const CENTER_X = GAME_WIDTH / 2;

/**
 * LeaderboardScene — Personal stats, achievements, and mode-aware ranked leaderboards.
 * Merges the former Hall of Fame screen (personal best + achievements) with the
 * mode/role-filtered leaderboard table into a single consistently-aligned page.
 */
export class LeaderboardScene extends Phaser.Scene {
  constructor() {
    super({ key: 'LeaderboardScene' });
  }

  init(data) {
    this.initialModeId = data?.modeId || 'flappy_cst';
    this.initialDeptIndex = data?.deptIndex ?? null;
    this.initialRoleFilter = data?.roleFilter ?? null;
  }

  create() {
    this._navigating = false;
    UIHelper.setVideoBackground(this);
    UIHelper.createGlassOverlay(this, 0.15);
    UIHelper.fadeIn(this);

    const logoKey = this.textures.exists('cst_logo') ? 'cst_logo' : 'logo';
    this.add.image(CENTER_X, 40, logoKey).setDisplaySize(46, 46).setDepth(5);

    this.add.text(CENTER_X, 78, 'LEADERBOARD', {
      fontFamily: 'Orbitron', fontSize: '20px', color: COLORS.gold, fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(5).setShadow(0, 0, '#ffd700', 4, true, true);

    this.add.text(CENTER_X, 100, 'Your Stats & Top Performers', {
      fontFamily: 'Inter', fontSize: '11px', color: COLORS.textMuted,
    }).setOrigin(0.5).setDepth(5);

    const player = getPlayer();

    // ── Personal Best card ──
    let y = 122;
    y = this.renderPersonalBest(y);

    // ── Achievements row ──
    y = this.renderAchievements(y);
    y += 14;

    // ── Mode tabs ──
    this.selectedModeId = this.initialModeId;
    this.tabsY = y + 18;
    this.createModeTabs(this.tabsY);
    y = this.tabsY + 26;

    if (this.initialDeptIndex !== null) {
      this.selectedDeptIndex = this.initialDeptIndex;
    } else if (player?.department) {
      const idx = DEPARTMENTS.indexOf(player.department);
      this.selectedDeptIndex = idx >= 0 ? idx : 0;
    } else {
      this.selectedDeptIndex = 0;
    }
    this.selectedRoleFilter = this.initialRoleFilter ?? player?.role ?? 'all';

    this.deptRowY = y + 16;
    this.deptLabel = this.add.text(CENTER_X, this.deptRowY, '', {
      fontFamily: 'Orbitron', fontSize: '12px', color: COLORS.gold, fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(5);

    this.roleTabsY = this.deptRowY + 30;
    this.entriesTopY = this.roleTabsY + 38;

    this.entriesContainer = this.add.container(CENTER_X, this.entriesTopY);
    this.statusText = this.add.text(CENTER_X, this.entriesTopY, 'Loading...', {
      fontFamily: 'Inter', fontSize: '13px', color: COLORS.textMuted, align: 'center',
    }).setOrigin(0.5).setDepth(5);

    this.loadEntries();

    UIHelper.createButton(this, CENTER_X, GAME_HEIGHT - 50, 'BACK', () => {
      UIHelper.goToScene(this, 'MenuScene');
    }, { width: 160, height: 44, fontSize: '14px', icon: 'back' });
  }

  /** Personal best score card — full content width, single row. Returns next y. */
  renderPersonalBest(y) {
    const bests = getBestScores();
    const topLocal = Object.entries(bests).sort((a, b) => b[1] - a[1])[0];
    if (!topLocal) return y;

    const modeInfo = Object.values(MODES).find((m) => m.id === topLocal[0]);
    const rowH = 46;
    const rowY = y + rowH / 2;

    this.add.rectangle(CENTER_X, rowY, CONTENT_W, rowH, 0xffd700, 0.16)
      .setStrokeStyle(2, COLORS.gold, 0.75).setDepth(5);

    UIHelper.drawIcon(this, modeInfo?.iconType || 'star', MARGIN + 12, rowY, 12, COLORS.gold, 6);

    this.add.text(MARGIN + 34, rowY, 'PERSONAL BEST', {
      fontFamily: 'Orbitron', fontSize: '10px', color: COLORS.textMuted,
    }).setOrigin(0, 0.5).setDepth(6);

    this.add.text(MARGIN + 34, rowY + 14, modeInfo?.name || topLocal[0], {
      fontFamily: 'Inter', fontSize: '12px', color: COLORS.text,
    }).setOrigin(0, 0.5).setDepth(6);

    this.add.text(GAME_WIDTH - MARGIN - 12, rowY, String(topLocal[1]), {
      fontFamily: 'Orbitron', fontSize: '20px', color: COLORS.gold, fontStyle: 'bold',
    }).setOrigin(1, 0.5).setDepth(6);

    return y + rowH + 10;
  }

  /** Achievement badges row — full content width. Returns next y. */
  renderAchievements(y) {
    const unlocked = getUnlockedAchievements();
    const rowH = 40;
    const rowY = y + rowH / 2;

    this.add.rectangle(CENTER_X, rowY, CONTENT_W, rowH, 0x0a1e33, 0.5)
      .setStrokeStyle(1, COLORS.gold, 0.4).setDepth(5);

    this.add.text(MARGIN + 12, rowY, 'ACHIEVEMENTS', {
      fontFamily: 'Orbitron', fontSize: '10px', color: COLORS.textMuted,
    }).setOrigin(0, 0.5).setDepth(6);

    if (unlocked.length > 0) {
      const spacing = 28;
      const startX = GAME_WIDTH - MARGIN - 12 - (unlocked.length - 1) * spacing;
      unlocked.forEach((id, idx) => {
        const iconType = ACHIEVEMENTS[id]?.iconType || 'star';
        UIHelper.drawIcon(this, iconType, startX + idx * spacing, rowY, 11, COLORS.gold, 6);
      });
    } else {
      this.add.text(GAME_WIDTH - MARGIN - 12, rowY, 'Play to earn badges', {
        fontFamily: 'Inter', fontSize: '11px', color: COLORS.textMuted,
      }).setOrigin(1, 0.5).setDepth(6);
    }

    return y + rowH + 8;
  }

  createModeTabs(y) {
    const modes = [MODES.FLAPPY_CST, MODES.JOURNEY, MODES.DEPARTMENT];
    const tabW = CONTENT_W / 3;
    const startX = MARGIN + tabW / 2;

    this.tabBgs = [];

    modes.forEach((mode, idx) => {
      const x = startX + idx * tabW;
      const isActive = mode.id === this.selectedModeId;

      const bg = this.add
        .rectangle(x, y, tabW - 8, 36, isActive ? 0xffd700 : 0x0a1e33, isActive ? 0.9 : 0.85)
        .setStrokeStyle(2, isActive ? 0xffffff : COLORS.gold, isActive ? 0.95 : 0.6)
        .setInteractive({ useHandCursor: true })
        .setDepth(5);

      UIHelper.drawIcon(this, mode.iconType, x - 34, y, 8, isActive ? COLORS.cstBlueDark : '#ffffff', 6);

      this.add
        .text(x + 6, y, mode.shortName || mode.name, {
          fontFamily: 'Inter',
          fontSize: '10px',
          fontStyle: isActive ? 'bold' : 'normal',
          color: isActive ? COLORS.cstBlueDark : '#ffffff',
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

  createRoleFilterTabs(y) {
    const options = [
      { id: 'all', label: 'All', icon: null },
      { id: ROLES.STUDENT, label: 'Students', icon: 'student' },
      { id: ROLES.ALUMNI, label: 'Alumni', icon: 'student' },
      { id: ROLES.LECTURER, label: 'Lecturers', icon: 'lecturer' },
    ];

    const tabW = CONTENT_W / options.length;
    const startX = MARGIN + tabW / 2;

    options.forEach((opt, idx) => {
      const x = startX + idx * tabW;
      const isActive = this.selectedRoleFilter === opt.id;

      const bg = this.add
        .rectangle(x, y, tabW - 6, 26, isActive ? 0xffd700 : 0x0a1e33, 0.85)
        .setStrokeStyle(2, isActive ? 0xffffff : COLORS.gold, isActive ? 0.9 : 0.55)
        .setInteractive({ useHandCursor: true })
        .setDepth(5);

      const textX = opt.icon ? x + 7 : x;
      if (opt.icon) {
        UIHelper.drawIcon(this, opt.icon, x - 30, y, 6, isActive ? COLORS.cstBlueDark : '#ffffff', 6);
      }

      this.add
        .text(textX, y, opt.label, {
          fontFamily: 'Inter',
          fontSize: '9px',
          fontStyle: isActive ? 'bold' : 'normal',
          color: isActive ? COLORS.cstBlueDark : '#ffffff',
        })
        .setOrigin(0.5)
        .setDepth(6);

      bg.on('pointerdown', () => {
        if (this.selectedRoleFilter === opt.id) return;
        this.scene.restart({
          modeId: this.selectedModeId,
          deptIndex: this.selectedDeptIndex,
          roleFilter: opt.id,
        });
      });
    });
  }

  async loadEntries() {
    this.entriesContainer.removeAll(true);
    this.statusText.setVisible(true);
    this.statusText.setText('Loading...');

    const player = getPlayer();
    let tableTopY = this.entriesTopY;

    // Department mode gets extra controls: dept cycle arrows + role filter row.
    if (this.selectedModeId === 'department') {
      const dept = DEPARTMENTS[this.selectedDeptIndex];
      const roleLabels = { all: dept, student: `${dept} Students`, alumni: `${dept} Alumni`, lecturer: 'Lecturer Rankings' };
      this.deptLabel.setText(roleLabels[this.selectedRoleFilter] || roleLabels.all);

      if (this.selectedRoleFilter !== ROLES.LECTURER) {
        const arrowBg = (x) => this.add.circle(x, this.deptRowY, 14, 0xf4f6fa, 0.9)
          .setStrokeStyle(2, COLORS.gold, 0.9)
          .setInteractive({ useHandCursor: true })
          .setDepth(5);

        const leftBg = arrowBg(MARGIN + 20);
        UIHelper.drawIcon(this, 'back', MARGIN + 20, this.deptRowY, 8, COLORS.cstBlueDark, 6);
        leftBg.on('pointerdown', () => {
          const next = (this.selectedDeptIndex - 1 + DEPARTMENTS.length) % DEPARTMENTS.length;
          this.scene.restart({ modeId: this.selectedModeId, deptIndex: next, roleFilter: this.selectedRoleFilter });
        });

        const rightBg = arrowBg(GAME_WIDTH - MARGIN - 20);
        UIHelper.drawIcon(this, 'forward', GAME_WIDTH - MARGIN - 20, this.deptRowY, 8, COLORS.cstBlueDark, 6);
        rightBg.on('pointerdown', () => {
          const next = (this.selectedDeptIndex + 1) % DEPARTMENTS.length;
          this.scene.restart({ modeId: this.selectedModeId, deptIndex: next, roleFilter: this.selectedRoleFilter });
        });
      }

      this.createRoleFilterTabs(this.roleTabsY);
    } else {
      this.deptLabel.setText('Global Leaderboard');
    }

    this.entriesContainer.setPosition(CENTER_X, tableTopY);
    this.statusText.setPosition(CENTER_X, tableTopY);

    if (!isFirebaseConfigured()) {
      this.statusText.setText('Firebase not configured.\nAdd credentials in firebase.js');
      return;
    }

    const filters = { modeId: this.selectedModeId, topN: 10 };
    if (this.selectedModeId === 'department') {
      filters.department = DEPARTMENTS[this.selectedDeptIndex];
      if (this.selectedRoleFilter !== 'all') {
        filters.role = this.selectedRoleFilter;
      }
    }

    const entries = await getLeaderboard(filters);
    this.statusText.setVisible(false);

    if (entries.length === 0) {
      this.statusText.setVisible(true);
      this.statusText.setText('No scores yet.\nBe the first to play!');
      return;
    }

    this.renderEntriesTable(entries);
  }

  renderEntriesTable(entries) {
    const headerY = 0;
    const rowHeight = 34;
    const contentWidth = CONTENT_W;
    const half = contentWidth / 2;

    // Column x-positions, defined once so header and rows always line up.
    const col = {
      rank: -half + 22,
      name: -half + 60,
      dept: half - 175,
      yearBatch: half - 95,
      score: half - 20,
    };

    this.entriesContainer.add(
      this.add.rectangle(0, headerY, contentWidth, 30, 0xffd700, 0.22).setStrokeStyle(2, COLORS.gold, 0.8)
    );

    const headers = [
      { label: 'Rank', x: col.rank, align: 0.5 },
      { label: 'Player', x: col.name, align: 0 },
      { label: 'Dept', x: col.dept, align: 0.5 },
      { label: 'Yr/Batch', x: col.yearBatch, align: 0.5 },
      { label: 'Score', x: col.score, align: 1 },
    ];

    headers.forEach((h) => {
      this.entriesContainer.add(
        this.add.text(h.x, headerY, h.label, {
          fontFamily: 'Orbitron', fontSize: '10px', color: COLORS.gold, fontStyle: 'bold',
        }).setOrigin(h.align, 0.5)
      );
    });

    entries.forEach((entry, idx) => {
      const rowY = headerY + 36 + idx * rowHeight;
      const isTop3 = idx < 3;

      this.entriesContainer.add(
        this.add.rectangle(0, rowY, contentWidth, rowHeight - 2, 0x0a1e33, idx % 2 === 0 ? 0.5 : 0.35)
          .setStrokeStyle(1, COLORS.gold, 0.2)
      );

      if (isTop3) {
        const rankColors = ['#FFD700', '#C0C0C0', '#CD7F32'];
        this.entriesContainer.add(UIHelper.drawIcon(this, 'medal', col.rank, rowY, 12, rankColors[idx], 0));
        this.entriesContainer.add(
          this.add.text(col.rank, rowY, String(idx + 1), {
            fontFamily: 'Orbitron', fontSize: '10px', color: '#1a1a2e', fontStyle: 'bold',
          }).setOrigin(0.5)
        );
      } else {
        this.entriesContainer.add(
          this.add.text(col.rank, rowY, `#${idx + 1}`, {
            fontFamily: 'Orbitron', fontSize: '11px', color: COLORS.gold, fontStyle: 'bold',
          }).setOrigin(0.5)
        );
      }

      const color = isTop3 ? COLORS.gold : COLORS.textMuted;
      const playerName = (entry.name || 'Anonymous').substring(0, 13);
      this.entriesContainer.add(
        this.add.text(col.name, rowY, playerName, {
          fontFamily: 'Inter', fontSize: '10px',
          color: isTop3 ? COLORS.silverLight : COLORS.text,
          fontStyle: isTop3 ? 'bold' : 'normal',
        }).setOrigin(0, 0.5)
      );

      this.entriesContainer.add(
        this.add.text(col.dept, rowY, (entry.department || '—').substring(0, 6), {
          fontFamily: 'Inter', fontSize: '9px', color: COLORS.textMuted,
        }).setOrigin(0.5)
      );

      const yearOrBatch = entry.role === ROLES.ALUMNI
        ? (entry.batch ? `'${String(entry.batch).slice(-2)}` : '—')
        : (entry.year || '—');
      this.entriesContainer.add(
        this.add.text(col.yearBatch, rowY, yearOrBatch, {
          fontFamily: 'Inter', fontSize: '9px', color: COLORS.textMuted,
        }).setOrigin(0.5)
      );

      this.entriesContainer.add(
        this.add.text(col.score, rowY, String(entry.score), {
          fontFamily: 'Orbitron', fontSize: '11px',
          color: isTop3 ? COLORS.gold : COLORS.silverLight,
          fontStyle: isTop3 ? 'bold' : 'normal',
        }).setOrigin(1, 0.5)
      );
    });

    this.entriesContainer.add(
      this.add.rectangle(0, headerY + 36 + entries.length * rowHeight + 4, contentWidth, 1, COLORS.gold, 0.4)
    );
  }
}
