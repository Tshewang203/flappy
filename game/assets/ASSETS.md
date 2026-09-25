# Assets Guide

## Images (PNG)

| File | Purpose |
|------|---------|
| `images/cst-logo.png` | CST logo |
| `images/campus1.jpg` | CST Main Entrance |
| `images/campus2.jpg` | Academic Block |
| `images/campus3.jpg` | Engineering Labs |
| `images/campus4.jpg` | Innovation Center |
| `images/campus5.jpg` | Silver Jubilee Plaza |

## Video

| File | Purpose |
|------|---------|
| `video/campus-bg.mp4` | Home + intro background (muted loop) |

## Audio

Drop MP3 files in `assets/audio/` — procedural beeps play automatically if files are missing.

| File | Purpose |
|------|---------|
| `jump.mp3` | Player tap / jump |
| `hit.mp3` | Collision |
| `point.mp3` | Passing an obstacle |
| `powerup.mp3` | Collecting power-up |
| `quiz-correct.mp3` | Correct quiz answer |
| `quiz-wrong.mp3` | Wrong quiz answer |
| `achievement.mp3` | Badge / legacy moment |
| `gameover.mp3` | Game over |
| `bgm.mp3` | Normal gameplay music (loop) |
| `bgm-intense.mp3` | High score music (score 50+, loop) |
| `button-click.mp3` | Menu button tap |

### AI generation prompts

Use these when generating sounds with ElevenLabs, Suno, Zapsplat, or Freesound:

- **jump** — Short arcade jump, soft pop, 0.2s
- **hit** — Soft thud impact, arcade style, 0.3s
- **point** — Light bell chime, rewarding, 0.2s
- **powerup** — Magical rising sparkle, 0.5s
- **quiz-correct** — Bright uplifting chime
- **quiz-wrong** — Soft low error beep (not harsh)
- **achievement** — Short sparkle celebration chime
- **gameover** — Soft descending tone, 0.5s
- **bgm** — Light upbeat loopable casual arcade music, no vocals
- **bgm-intense** — Fast electronic tense arcade loop, no vocals
- **button-click** — Subtle UI click, 0.05s

Refresh the game after adding files — no code changes needed.
