import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../config/constants.js';
import { getPlayer, isSoundEnabled, setSoundEnabled } from '../utils/storage.js';
import { UIHelper } from '../utils/UIHelper.js';
import { getLeaderboard, isFirebaseConfigured } from '../firebase.js';

/**
 * MenuScene — Start screen with Play, Leaderboard, and Sound toggle.
 */
export class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' });
  }

  create() {
    UIHelper.fadeIn(this);
    UIHelper.createBackgroundParticles(this);

    // Background gradient overlay
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x0f1f33, 0.5);

    // Logo
    const logo = this.add.image(GAME_WIDTH / 2, 130, 'logo');
    this.tweens.add({
      targets: logo,
      y: logo.y - 8,
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Title
    UIHelper.createTitle(
      this,
      230,
      'CST Silver Flight',
      'Choose Your Journey — 25th Silver Jubilee'
    );

    // Jubilee badge
    const badge = this.add
      .text(GAME_WIDTH / 2, 310, '🥈 25 YEARS 🥈', {
        fontFamily: 'Orbitron',
        fontSize: '16px',
        color: COLORS.gold,
      })
      .setOrigin(0.5);

    this.tweens.add({
      targets: badge,
      scaleX: { from: 1, to: 1.05 },
      scaleY: { from: 1, to: 1.05 },
      duration: 1200,
      yoyo: true,
      repeat: -1,
    });

    // Buttons
    UIHelper.createButton(this, GAME_WIDTH / 2, 400, '▶  PLAY', () => {
      const player = getPlayer();
      if (player) {
        UIHelper.fadeToScene(this, 'ModeScene');
      } else {
        UIHelper.fadeToScene(this, 'PlayerInfoScene');
      }
    });

    UIHelper.createButton(this, GAME_WIDTH / 2, 470, '🏆  LEADERBOARD', () => {
      this.showLeaderboard();
    });

    // Sound toggle
    this.soundEnabled = isSoundEnabled();
    const soundBtn = UIHelper.createButton(
      this,
      GAME_WIDTH / 2,
      540,
      this.soundEnabled ? '🔊  SOUND ON' : '🔇  SOUND OFF',
      () => {
        this.soundEnabled = !this.soundEnabled;
        setSoundEnabled(this.soundEnabled);
        soundBtn.text.setText(this.soundEnabled ? '🔊  SOUND ON' : '🔇  SOUND OFF');
      },
      { width: 200, fontSize: '15px' }
    );

    // Player info display if logged in
    const player = getPlayer();
    if (player) {
      this.add
        .text(GAME_WIDTH / 2, 610, `Playing as: ${player.name} (${player.department})`, {
          fontFamily: 'Inter',
          fontSize: '12px',
          color: COLORS.textMuted,
        })
        .setOrigin(0.5);

      UIHelper.createButton(
        this,
        GAME_WIDTH / 2,
        660,
        'Change Player',
        () => UIHelper.fadeToScene(this, 'PlayerInfoScene', { changePlayer: true }),
        { width: 180, height: 40, fontSize: '13px' }
      );
    }

    // Tap hint
    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 30, 'College of Science & Technology', {
        fontFamily: 'Inter',
        fontSize: '11px',
        color: COLORS.textMuted,
      })
      .setOrigin(0.5);
  }

  async showLeaderboard() {
    // Overlay panel
    const overlay = this.add.rectangle(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2,
      GAME_WIDTH,
      GAME_HEIGHT,
      0x000000,
      0.7
    ).setInteractive();

    const panel = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2);

    const panelBg = this.add
      .rectangle(0, 0, GAME_WIDTH - 40, GAME_HEIGHT - 120, 0x1e3a5f, 0.95)
      .setStrokeStyle(2, 0xc0c0c0, 0.5);

    const title = this.add
      .text(0, -280, '🏆 LEADERBOARD', {
        fontFamily: 'Orbitron',
        fontSize: '22px',
        color: COLORS.gold,
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    const loadingText = this.add
      .text(0, 0, 'Loading scores...', {
        fontFamily: 'Inter',
        fontSize: '14px',
        color: COLORS.textMuted,
      })
      .setOrigin(0.5);

    panel.add([panelBg, title, loadingText]);

    const close = () => {
      panel.destroy();
      overlay.destroy();
    };

    overlay.on('pointerdown', close);

    UIHelper.createButton(this, GAME_WIDTH / 2, GAME_HEIGHT - 70, '✕  CLOSE', close, {
      width: 160,
      height: 44,
      fontSize: '14px',
    });

    // Fetch leaderboard
    const entries = await getLeaderboard(10);
    loadingText.destroy();

    if (!isFirebaseConfigured()) {
      const msg = this.add
        .text(0, 0, 'Firebase not configured.\nAdd your credentials in firebase.js', {
          fontFamily: 'Inter',
          fontSize: '13px',
          color: COLORS.textMuted,
          align: 'center',
        })
        .setOrigin(0.5);
      panel.add(msg);
      return;
    }

    if (entries.length === 0) {
      const msg = this.add
        .text(0, 0, 'No scores yet.\nBe the first to play!', {
          fontFamily: 'Inter',
          fontSize: '14px',
          color: COLORS.textMuted,
          align: 'center',
        })
        .setOrigin(0.5);
      panel.add(msg);
      return;
    }

    // Header row
    const headerY = -230;
    const cols = [-150, -30, 80, 150];
    const headers = ['Name', 'Dept', 'Year', 'Score'];
    headers.forEach((h, i) => {
      panel.add(
        this.add
          .text(cols[i], headerY, h, {
            fontFamily: 'Orbitron',
            fontSize: '11px',
            color: COLORS.silver,
            fontStyle: 'bold',
          })
          .setOrigin(i === 3 ? 1 : 0, 0.5)
      );
    });

    // Entries
    entries.forEach((entry, idx) => {
      const rowY = headerY + 35 + idx * 42;
      const rankColor = idx < 3 ? COLORS.gold : COLORS.text;

      panel.add(
        this.add
          .text(-170, rowY, `${idx + 1}.`, {
            fontFamily: 'Orbitron',
            fontSize: '12px',
            color: rankColor,
          })
          .setOrigin(0, 0.5)
      );

      const deptShort = entry.department?.length > 8
        ? entry.department.substring(0, 7) + '…'
        : entry.department;

      const rowData = [
        { text: entry.name, x: cols[0] },
        { text: deptShort, x: cols[1] },
        { text: entry.year, x: cols[2] },
        { text: String(entry.score), x: cols[3] },
      ];

      rowData.forEach((col, i) => {
        panel.add(
          this.add
            .text(col.x, rowY, col.text, {
              fontFamily: 'Inter',
              fontSize: '12px',
              color: COLORS.text,
            })
            .setOrigin(i === 3 ? 1 : 0, 0.5)
        );
      });
    });
  }
}
