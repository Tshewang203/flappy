import { STORAGE_KEYS } from '../config/constants.js';

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

/** Get best scores per mode */
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

/** Sound preference (default on) */
export function isSoundEnabled() {
  const val = localStorage.getItem(STORAGE_KEYS.SOUND);
  return val === null ? true : val === 'true';
}

export function setSoundEnabled(enabled) {
  localStorage.setItem(STORAGE_KEYS.SOUND, String(enabled));
}
