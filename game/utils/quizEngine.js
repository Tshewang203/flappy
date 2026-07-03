/**
 * Quiz engine — separate pools and triggers for Journey (CST) vs Department modes.
 * Data loaded from JSON at boot via initQuizData().
 */

let cstHistory = null;
let departmentQuestions = null;

/** @type {Set<number>} Tracks which journey trigger scores have fired this session */
const journeyTriggered = new Set();

/** Dept mode: track used question IDs per department to avoid immediate repeats */
const deptUsedQuestions = new Map();

/**
 * Load structured JSON question banks (called once from BootScene).
 */
export function initQuizData(cstData, deptData) {
  cstHistory = cstData;
  departmentQuestions = deptData;
}

export function isQuizDataReady() {
  return Boolean(cstHistory?.timeline?.length && departmentQuestions);
}

/** Journey mode: exact score milestones only — 5, 15, 25 */
export const JOURNEY_QUIZ_SCORES = [5, 15, 25];

/**
 * Point-based trigger for CST Journey mode.
 * Fires once per milestone score.
 */
export function shouldTriggerJourneyQuiz(score) {
  if (!JOURNEY_QUIZ_SCORES.includes(score)) return false;
  if (journeyTriggered.has(score)) return false;
  return true;
}

/** Mark a journey milestone as consumed */
export function markJourneyQuizTriggered(score) {
  journeyTriggered.add(score);
}

/** Reset journey triggers (new game session) */
export function resetJourneyQuizState() {
  journeyTriggered.clear();
}

/** Get sequential quiz index (0, 1, 2) for a given trigger score */
export function getJourneyQuizIndex(triggerScore) {
  return JOURNEY_QUIZ_SCORES.indexOf(triggerScore);
}

/**
 * Get the ordered timeline entry + question for a journey quiz.
 * Never random — follows JSON timeline sequence.
 */
export function getJourneyQuiz(triggerScore) {
  if (!cstHistory?.timeline) return null;
  const entry = cstHistory.timeline.find((t) => t.triggerScore === triggerScore);
  if (!entry) return null;
  return {
    timeline: {
      order: entry.order,
      year: entry.year,
      title: entry.title,
      description: entry.description,
      emoji: entry.emoji,
      location: entry.location,
    },
    question: normalizeQuestion(entry.question),
    quizIndex: getJourneyQuizIndex(triggerScore),
  };
}

/**
 * Get timeline card for post-quiz display (same ordered entry).
 */
export function getJourneyTimelineCard(quizIndex) {
  if (!cstHistory?.timeline?.[quizIndex]) return null;
  const entry = cstHistory.timeline[quizIndex];
  return {
    order: entry.order,
    year: entry.year,
    title: entry.title,
    description: entry.description,
    emoji: entry.emoji,
    location: entry.location,
    sequenceLabel: formatTimelineSequence(quizIndex),
  };
}

/** Build "2001 → 2014 → 2026" style label up to current index */
export function formatTimelineSequence(upToIndex) {
  if (!cstHistory?.timeline) return '';
  return cstHistory.timeline
    .slice(0, upToIndex + 1)
    .map((t) => t.year)
    .join(' → ');
}

/**
 * Difficulty scaling for Department mode based on player score.
 */
export function getDifficultyForScore(score) {
  if (score < 15) return 'easy';
  if (score < 35) return 'medium';
  return 'hard';
}

/**
 * Random probability trigger for Department mode.
 * Not fixed intervals — chance grows with score and progression.
 */
export function shouldTriggerDeptQuiz(score, obstaclesPassed, lastQuizObstacle, rng = Math.random) {
  const minObstacles = 8;
  const cooldown = 5;
  const baseChance = 0.07;
  const maxChance = 0.32;

  if (obstaclesPassed < minObstacles) return false;
  if (obstaclesPassed - lastQuizObstacle < cooldown) return false;

  const progressBonus = obstaclesPassed * 0.004;
  const scoreBonus = score * 0.002;
  const chance = Math.min(maxChance, baseChance + progressBonus + scoreBonus);

  return rng() < chance;
}

/**
 * Pick a department question — never from CST pool.
 * Difficulty scales with score; avoids immediate repeats.
 */
export function getDeptQuestion(department, score) {
  if (!departmentQuestions) return null;

  const dept = departmentQuestions[department];
  if (!dept) return null;

  const difficulty = getDifficultyForScore(score);
  let pool = dept[difficulty] || [];
  if (pool.length === 0) {
    pool = [...(dept.easy || []), ...(dept.medium || []), ...(dept.hard || [])];
  }
  if (pool.length === 0) return null;

  const usedKey = `${department}:${difficulty}`;
  if (!deptUsedQuestions.has(usedKey)) deptUsedQuestions.set(usedKey, new Set());

  const used = deptUsedQuestions.get(usedKey);
  let available = pool.filter((q) => !used.has(q.q));
  if (available.length === 0) {
    used.clear();
    available = pool;
  }

  const picked = available[Math.floor(Math.random() * available.length)];
  used.add(picked.q);

  return {
    question: normalizeQuestion(picked),
    difficulty,
    department,
  };
}

/** Reset dept used-question tracking for new game */
export function resetDeptQuizState() {
  deptUsedQuestions.clear();
}

/** Normalize JSON question to QuizScene format */
function normalizeQuestion(raw) {
  if (!raw) return null;
  return {
    q: raw.q,
    options: raw.options,
    answer: raw.answer,
    type: raw.type || 'multiple_choice',
    year: raw.year,
    event: raw.event,
  };
}

/** Legacy re-export for any code still importing from questions.js */
export function getDifficultyForProgress(obstacleCount) {
  return getDifficultyForScore(obstacleCount);
}

export function getRandomQuestion(category, difficulty = 'easy') {
  if (category === 'CST') {
    const entry = cstHistory?.timeline?.[0];
    return entry ? normalizeQuestion(entry.question) : null;
  }
  const result = getDeptQuestion(category, difficulty === 'hard' ? 40 : difficulty === 'medium' ? 20 : 5);
  return result?.question || null;
}
