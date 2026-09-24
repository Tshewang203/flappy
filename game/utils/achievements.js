import { STORAGE_KEYS } from '../config/constants.js';

function readJSON(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export const ACHIEVEMENTS = {
  first_flight: { id: 'first_flight', iconType: 'target', name: 'First Flight', desc: 'Complete your first game' },
  quiz_master: { id: 'quiz_master', iconType: 'book', name: 'Quiz Master', desc: 'Answer 10 quizzes correctly' },
  unstoppable: { id: 'unstoppable', iconType: 'flame', name: 'Unstoppable', desc: 'Reach a score of 100' },
  silver_legend: { id: 'silver_legend', iconType: 'medal', name: 'Silver Legend', desc: 'Witness a Legacy Moment' },
  jubilee_pilot: { id: 'jubilee_pilot', iconType: 'student', name: 'Jubilee Pilot', desc: 'Play all 3 game modes' },
  streak_hero: { id: 'streak_hero', iconType: 'star', name: 'Streak Hero', desc: 'Get 5 quiz answers in a row' },
};

export function getStats() {
  return readJSON(STORAGE_KEYS.STATS, {
    gamesPlayed: 0,
    quizCorrect: 0,
    quizTotal: 0,
    maxScore: 0,
    modesPlayed: [],
    legacySeen: [],
  });
}

export function saveStats(stats) {
  localStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(stats));
}

export function getUnlockedAchievements() {
  return readJSON(STORAGE_KEYS.ACHIEVEMENTS, []);
}

export function unlockAchievement(id) {
  const unlocked = getUnlockedAchievements();
  if (unlocked.includes(id)) return false;
  unlocked.push(id);
  localStorage.setItem(STORAGE_KEYS.ACHIEVEMENTS, JSON.stringify(unlocked));
  return true;
}

/** Record game session stats and check achievements */
export function recordGameEnd({ score, mode, quizCorrectSession = 0, legacyTriggered = false }) {
  const stats = getStats();
  stats.gamesPlayed = (stats.gamesPlayed || 0) + 1;
  stats.maxScore = Math.max(stats.maxScore || 0, score);
  if (!stats.modesPlayed.includes(mode)) stats.modesPlayed.push(mode);
  saveStats(stats);

  const newAchievements = [];

  if (stats.gamesPlayed >= 1 && unlockAchievement('first_flight')) {
    newAchievements.push(ACHIEVEMENTS.first_flight);
  }
  if (score >= 100 && unlockAchievement('unstoppable')) {
    newAchievements.push(ACHIEVEMENTS.unstoppable);
  }
  if (stats.modesPlayed.length >= 3 && unlockAchievement('jubilee_pilot')) {
    newAchievements.push(ACHIEVEMENTS.jubilee_pilot);
  }
  if (legacyTriggered && unlockAchievement('silver_legend')) {
    newAchievements.push(ACHIEVEMENTS.silver_legend);
  }

  return newAchievements;
}

export function recordQuizAnswer(correct, streak = 0) {
  const stats = getStats();
  stats.quizTotal = (stats.quizTotal || 0) + 1;
  if (correct) stats.quizCorrect = (stats.quizCorrect || 0) + 1;
  saveStats(stats);

  const newAchievements = [];
  if (stats.quizCorrect >= 10 && unlockAchievement('quiz_master')) {
    newAchievements.push(ACHIEVEMENTS.quiz_master);
  }
  if (streak >= 5 && unlockAchievement('streak_hero')) {
    newAchievements.push(ACHIEVEMENTS.streak_hero);
  }
  return newAchievements;
}

/** CST messages from players (local only) */
export function getCSTMessages() {
  return readJSON(STORAGE_KEYS.MESSAGES, []);
}

export function saveCSTMessage(message) {
  const msgs = getCSTMessages();
  msgs.unshift({ text: message, date: new Date().toISOString() });
  localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(msgs.slice(0, 50)));
}

export function getRandomCSTMessage() {
  const msgs = getCSTMessages();
  if (msgs.length === 0) return null;
  return msgs[Math.floor(Math.random() * msgs.length)];
}
