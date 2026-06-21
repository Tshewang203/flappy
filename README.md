# CST Silver Flight: Learn • Play • Compete

Interactive learning + competition platform for CST's **25th Silver Jubilee**.

## Feature checklist

| Feature | Status |
|---------|--------|
| 3 game modes (Classic, Journey, Department) | ✅ |
| Student / Lecturer roles | ✅ |
| Avatar (camera, upload, default styles) | ✅ |
| Quiz every 15 obstacles | ✅ |
| Quiz difficulty scaling + streak bonus | ✅ |
| CST Legacy Moments (scores 25/50/75/100) | ✅ |
| Hall of Fame screen | ✅ |
| Achievements (local badges) | ✅ |
| Surprise rewards | ✅ |
| Campus PNG backgrounds + video home | ✅ |
| Firebase leaderboards (role-aware) | ✅ |
| Message to CST (game over) | ✅ |
| Cinematic intro scene | ✅ |
| Audio (MP3 files or beep fallback) | ✅ |

---

## Quick Start

```bash
cd game
npx serve .
```

Flow: **Intro → Menu → Player Info → Mode Select → Play**

---

## Add Your Assets

See [game/assets/ASSETS.md](game/assets/ASSETS.md)

| Asset | Path |
|-------|------|
| Logo | `assets/images/cst-logo.png` |
| Campus 1–5 | `assets/images/campus1.png` … `campus5.png` |
| Video | `assets/video/campus-bg.mp4` |
| Audio (optional) | `assets/audio/jump.mp3`, `hit.mp3`, `bgm.mp3`, etc. |

---

## Scenes

- `BootScene` — preload textures
- `IntroScene` — cinematic start
- `MenuScene` — video background home
- `PlayerInfoScene` — player + avatar
- `ModeScene` — mode selection (ModeSelectionScene)
- `GameScene` — gameplay
- `QuizScene` — quiz overlay
- `LegacyScene` — CST timeline slides
- `UIScene` — HUD
- `LeaderboardScene` — top 10 scores
- `HallOfFameScene` — champions + badges
- `GameOverScene` — score + message

---

## Firebase Setup

1. Create project at [Firebase Console](https://console.firebase.google.com)
2. Enable Firestore
3. Paste config into `game/firebase.js`
4. Rules:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /leaderboard/{doc} {
      allow read: if true;
      allow create: if request.resource.data.score is int
                    && request.resource.data.score >= 0
                    && request.resource.data.score <= 99999;
    }
  }
}
```

---

## Deploy to Vercel

```bash
npx vercel
```

---

## GitHub

https://github.com/shoc05/cst-silver-flight
