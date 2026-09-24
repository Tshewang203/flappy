/**
 * Quiz engine — question pools and selection for the Silver Jubilee Challenge (CST history)
 * and the Department Challenge (academic questions). Classic Mode never uses it.
 *
 * Data (loaded once at boot via initQuizData):
 *   data/cst_history.json         { timeline: [{ year, title, ..., question }], facts: [question] }
 *   data/department_questions.json { <Department>: { year1..year4: { easy, medium, hard: [question] } } }
 *
 * Selection uses shuffled "bags": each pool is shuffled once per game and dealt from the top, so
 * questions are random across playthroughs but never repeat within one until the pool runs out
 * (then it is reshuffled, keeping the last question away from the front).
 */

import { DEPT_QUIZ_FIRST_CHECKPOINTS, DEPT_QUIZ_RANDOM_GAP } from '../config/constants.js';

let cstHistory = null;
let departmentQuestions = null;

/** Per-game bags of not-yet-asked questions, keyed by pool (e.g. "IT|year2|medium", "jubilee") */
const bags = new Map();
/** Last question dealt from each pool, so a reshuffled bag never starts with it */
const lastDealt = new Map();

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

/** Forget every bag — call at the start of each game so a new playthrough gets a fresh order. */
export function resetQuizState() {
  bags.clear();
  lastDealt.clear();
}

function shuffle(items) {
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Deal the next item from a pool's bag, refilling (without an immediate repeat) when empty. */
function deal(key, pool) {
  if (!pool?.length) return null;
  let bag = bags.get(key);
  if (!bag?.length) {
    bag = shuffle(pool);
    const last = lastDealt.get(key);
    if (bag.length > 1 && bag[bag.length - 1] === last) {
      [bag[0], bag[bag.length - 1]] = [bag[bag.length - 1], bag[0]];
    }
    bags.set(key, bag);
  }
  const item = bag.pop();
  lastDealt.set(key, item);
  return item;
}

// ─── Silver Jubilee Challenge ──────────────────────────────────────────────────────────

/**
 * A random CST history question for a Jubilee checkpoint or mid-stage quiz.
 * Draws from timeline questions (which also unlock their history card) and general CST facts,
 * without repeating within a playthrough.
 * @returns {{ question: object, timelineIndex: number|null } | null}
 */
export function getJubileeQuiz() {
  const timeline = cstHistory?.timeline || [];
  const facts = cstHistory?.facts || [];
  const pool = [
    ...timeline.map((entry, i) => ({ raw: entry.question, timelineIndex: i })),
    ...facts.map((raw) => ({ raw, timelineIndex: null })),
  ].filter((p) => p.raw);
  const picked = deal('jubilee', pool);
  if (!picked) return null;
  return { question: normalizeQuestion(picked.raw), timelineIndex: picked.timelineIndex };
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

// ─── Department Challenge ──────────────────────────────────────────────────────────────

/**
 * Walls flown at which the next Department quiz fires. The first quizzes come at the fixed
 * checkpoints (3, 6, 9); after that each gap is random (3–5 walls). Counting walls rather
 * than score keeps quiz bonuses and penalties from shifting the schedule.
 * @param {number} wallsFlown - walls passed so far (0 at the start of a game)
 * @param {number} quizzesAsked - Department quizzes already triggered this game
 */
export function getNextDeptQuizCheckpoint(wallsFlown, quizzesAsked) {
  if (quizzesAsked < DEPT_QUIZ_FIRST_CHECKPOINTS.length) {
    return Math.max(DEPT_QUIZ_FIRST_CHECKPOINTS[quizzesAsked], wallsFlown + 1);
  }
  const gap = DEPT_QUIZ_RANDOM_GAP.min
    + Math.floor(Math.random() * (DEPT_QUIZ_RANDOM_GAP.max - DEPT_QUIZ_RANDOM_GAP.min + 1));
  return wallsFlown + gap;
}

/**
 * Difficulty ramps with progress (walls flown):
 *   below 6: easy · 6–8: easy or medium · 9–17: medium · 18–26: medium or hard · 27+: hard
 */
export function getDifficultyForProgress(wallsFlown) {
  if (wallsFlown < 6) return 'easy';
  if (wallsFlown < 9) return Math.random() < 0.5 ? 'easy' : 'medium';
  if (wallsFlown < 18) return 'medium';
  if (wallsFlown < 27) return Math.random() < 0.5 ? 'medium' : 'hard';
  return 'hard';
}

/**
 * Map a player's stored year to a question-bank year key. The bank covers years 1–4;
 * 5th-year students (e.g. Architecture), alumni and lecturers get Year 4 questions.
 * @param {object|null} player - stored player ({ role, year })
 */
export function getYearKey(player) {
  const match = /^(\d)/.exec(player?.year || '');
  const n = match ? Number(match[1]) : 4;
  return `year${Math.min(Math.max(n, 1), 4)}`;
}

const YEAR_KEYS = ['year1', 'year2', 'year3', 'year4'];
const DIFFICULTIES = ['easy', 'medium', 'hard'];

/**
 * Pick a Department question for the player's department and year at the given difficulty,
 * falling back to another difficulty (same year) and then to other years if a pool is
 * missing. Never draws from the CST history pool.
 * @returns {{ question: object, difficulty: string, department: string, yearKey: string } | null}
 */
export function getDeptQuestion(department, yearKey, difficulty) {
  const dept = departmentQuestions?.[department];
  if (!dept) return null;

  const years = [yearKey, ...YEAR_KEYS.filter((y) => y !== yearKey)];
  const diffs = [difficulty, ...DIFFICULTIES.filter((d) => d !== difficulty)];
  for (const y of years) {
    for (const d of diffs) {
      const pool = dept[y]?.[d];
      if (!pool?.length) continue;
      const raw = deal(`${department}|${y}|${d}`, pool);
      return { question: normalizeQuestion(raw), difficulty: d, department, yearKey: y };
    }
  }
  return null;
}

// ─── Shared ────────────────────────────────────────────────────────────────────────────

/**
 * Convert a stored question into the QuizScene format { q, options, answer: index, type }.
 * Accepts both schemas: the bank's { question, options, answer: "text" } and the history
 * file's { q, options, answer: index }. Multiple-choice options are shuffled every time;
 * True/False keeps the True, False order.
 */
function normalizeQuestion(raw) {
  if (!raw) return null;
  const text = raw.question ?? raw.q;
  const options = raw.options || [];
  const correct = typeof raw.answer === 'number' ? options[raw.answer] : raw.answer;
  const isTrueFalse = raw.type === 'true_false';
  const shown = isTrueFalse ? options.slice() : shuffle(options);
  return {
    id: raw.id,
    q: text,
    options: shown,
    answer: shown.indexOf(correct),
    type: isTrueFalse ? 'true_false' : raw.type === 'year_match' ? 'year_match' : 'mcq',
  };
}
