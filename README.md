# CST Silver Flight: Choose Your Journey

A browser-based Flappy Bird arcade game celebrating the **25th Silver Jubilee** of the College of Science and Technology (CST).

Built with **Phaser 3**, **Firebase Firestore**, and deployable on **Vercel**.

---

## Features

- **3 Game Modes**: Flappy CST (Classic), 25 Years Journey (Story), Hackathon Escape (Challenge)
- **Player System**: Login-free name/department/year collection with localStorage
- **Power-Ups**: Coffee (slow-mo), Shield, Double Score, WiFi Boost
- **Leaderboard**: Firebase Firestore top-10 global scores
- **Responsive**: Works on mobile and desktop
- **Silver Jubilee Theme**: Modern silver + blue UI

---

## Quick Start (Local)

```bash
# Navigate to the game folder
cd game

# Serve with any static server (ES modules require HTTP)
npx serve .
# OR
python -m http.server 8080
```

Open `http://localhost:3000` (serve) or `http://localhost:8080` (python).

---

## Project Structure

```
game/
├── index.html          # Entry point
├── main.js             # Phaser game config
├── styles.css          # Global styles
├── firebase.js         # Firestore leaderboard
├── config/
│   └── constants.js    # Shared constants
├── utils/
│   ├── storage.js      # localStorage helpers
│   └── UIHelper.js     # UI component helpers
├── scenes/
│   ├── BootScene.js    # Asset generation + boot
│   ├── MenuScene.js    # Start screen
│   ├── PlayerInfoScene.js
│   ├── ModeScene.js    # Mode selection
│   ├── GameScene.js    # Core gameplay
│   ├── UIScene.js      # HUD overlay
│   └── GameOverScene.js
└── assets/             # Placeholder for custom assets
```

---

## Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com) and create a project.
2. Enable **Firestore Database** (start in test mode for development).
3. Copy your web app config from Project Settings → General → Your apps.
4. Paste credentials into `game/firebase.js`:

```js
const firebaseConfig = {
  apiKey: 'YOUR_API_KEY',
  authDomain: 'YOUR_PROJECT.firebaseapp.com',
  projectId: 'YOUR_PROJECT_ID',
  storageBucket: 'YOUR_PROJECT.appspot.com',
  messagingSenderId: 'YOUR_SENDER_ID',
  appId: 'YOUR_APP_ID',
};
```

5. Set Firestore security rules:

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

### Option A: Vercel CLI

```bash
npm i -g vercel
vercel
```

The included `vercel.json` routes traffic to the `game/` folder.

### Option B: GitHub Integration

1. Push this repo to GitHub.
2. Import the project at [vercel.com/new](https://vercel.com/new).
3. Vercel auto-detects the `vercel.json` configuration.
4. Deploy — your game will be live at `your-project.vercel.app`.

### Option C: Deploy game folder only

```bash
cd game
npx vercel
```

---

## Controls

| Action | Desktop | Mobile |
|--------|---------|--------|
| Jump   | Space / Click | Tap |
| Navigate menus | Click | Tap |

---

## Game Modes

| Mode | Description | Difficulty |
|------|-------------|------------|
| Flappy CST | Classic books/exams obstacles | Normal |
| 25 Years Journey | Background evolves with score milestones | Normal |
| Hackathon Escape | Fast bugs/errors/deadlines | Hard |

---

## Customization

- **Logo**: Replace the procedural logo in `BootScene.js` or add a PNG to `assets/images/` and load it in BootScene.
- **Sounds**: Add audio files to `assets/audio/` and load/play them in scenes.
- **Colors**: Edit `config/constants.js` → `COLORS` and `JOURNEY_MILESTONES`.
- **Difficulty**: Tune `MODE_CONFIG` values in `config/constants.js`.

---

## License

Built for CST Silver Jubilee celebration. All rights reserved.
