import { STORAGE_KEYS, AVATAR_SIZE } from '../config/constants.js';

/** Read parsed JSON from localStorage safely */
function readJSON(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

/** Get stored player info or null */
export function getPlayer() {
  return readJSON(STORAGE_KEYS.PLAYER);
}

/** Save player info to localStorage */
export function savePlayer(player) {
  localStorage.setItem(STORAGE_KEYS.PLAYER, JSON.stringify(player));
}

/** Clear stored player info */
export function clearPlayer() {
  localStorage.removeItem(STORAGE_KEYS.PLAYER);
}

/** Get best scores per mode (keeps only highest per mode) */
export function getBestScores() {
  return readJSON(STORAGE_KEYS.BEST_SCORES, {});
}

/** Update best score for a mode if current is higher */
export function updateBestScore(mode, score) {
  const bests = getBestScores();
  if (!bests[mode] || score > bests[mode]) {
    bests[mode] = score;
    localStorage.setItem(STORAGE_KEYS.BEST_SCORES, JSON.stringify(bests));
    return true;
  }
  return false;
}

/** Get ALL score history (all attempts) for a mode */
export function getScoreHistory(mode) {
  const history = readJSON(STORAGE_KEYS.STATS, {});
  if (!history[mode]) {
    history[mode] = [];
  }
  return history[mode];
}

/** Add a score to the history (keeps all scores, not just best) */
export function addScoreToHistory(mode, score, timestamp = new Date().toISOString()) {
  const stats = readJSON(STORAGE_KEYS.STATS, {});
  if (!stats[mode]) {
    stats[mode] = [];
  }
  
  // Add new score to history
  stats[mode].push({
    score,
    timestamp,
  });
  
  // Keep last 100 scores per mode (prevent storage bloat)
  if (stats[mode].length > 100) {
    stats[mode] = stats[mode].slice(-100);
  }
  
  localStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(stats));
}

/** Get score statistics (avg, min, max, count) for a mode */
export function getScoreStats(mode) {
  const history = getScoreHistory(mode);
  if (history.length === 0) {
    return { count: 0, best: 0, average: 0, total: 0 };
  }
  
  const scores = history.map(h => h.score);
  const best = Math.max(...scores);
  const average = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  const total = scores.reduce((a, b) => a + b, 0);
  
  return {
    count: scores.length,
    best,
    average,
    total,
  };
}

/** Legacy master sound toggle */
export function isSoundEnabled() {
  const val = localStorage.getItem(STORAGE_KEYS.SOUND);
  return val === null ? true : val === 'true';
}

export function setSoundEnabled(enabled) {
  localStorage.setItem(STORAGE_KEYS.SOUND, String(enabled));
  setMusicEnabled(enabled);
  setSfxEnabled(enabled);
}

/** Music preference (default on) */
export function isMusicEnabled() {
  if (!isSoundEnabled()) return false;
  const val = localStorage.getItem(STORAGE_KEYS.MUSIC);
  return val === null ? true : val === 'true';
}

export function setMusicEnabled(enabled) {
  localStorage.setItem(STORAGE_KEYS.MUSIC, String(enabled));
}

/** Sound effects preference (default on) */
export function isSfxEnabled() {
  if (!isSoundEnabled()) return false;
  const val = localStorage.getItem(STORAGE_KEYS.SFX);
  return val === null ? true : val === 'true';
}

export function setSfxEnabled(enabled) {
  localStorage.setItem(STORAGE_KEYS.SFX, String(enabled));
}

/** Get player avatar as base64 data URL */
export function getAvatar() {
  return localStorage.getItem(STORAGE_KEYS.AVATAR);
}

/** Save avatar base64 to localStorage (never sent to Firebase) */
export function saveAvatar(base64) {
  localStorage.setItem(STORAGE_KEYS.AVATAR, base64);
}

/** Remove stored avatar */
export function removeAvatar() {
  localStorage.removeItem(STORAGE_KEYS.AVATAR);
}

/**
 * Resize an image source to a square base64 PNG.
 * @param {string} src - data URL or image URL
 * @param {number} size - output dimension
 */
export function resizeImageToBase64(src, size = AVATAR_SIZE) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');

      // Center-crop to square
      const minDim = Math.min(img.width, img.height);
      const sx = (img.width - minDim) / 2;
      const sy = (img.height - minDim) / 2;

      ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = reject;
    img.src = src;
  });
}

/** Get unlocked achievements */
export function getUnlockedAchievements() {
  return readJSON(STORAGE_KEYS.ACHIEVEMENTS, []);
}

/** Add achievement */
export function unlockAchievement(achievementId) {
  const unlocked = getUnlockedAchievements();
  if (!unlocked.includes(achievementId)) {
    unlocked.push(achievementId);
    localStorage.setItem(STORAGE_KEYS.ACHIEVEMENTS, JSON.stringify(unlocked));
  }
}
