/**
 * Firebase Firestore leaderboard integration.
 *
 * Leaderboard types:
 * - Classic / Journey → global (all players)
 * - Department Challenge → per-department for students, separate for lecturers
 */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  runTransaction,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { MODES } from './config/constants.js';

/**
 * Some early leaderboard documents stored the mode's display name (e.g. "Department Challenge")
 * instead of its stable id (e.g. "department"). Normalize both shapes to the id so old scores
 * still show up alongside new ones.
 */
function normalizeModeId(rawMode) {
  const byName = Object.values(MODES).find((m) => m.name === rawMode);
  return byName ? byName.id : rawMode;
}

const firebaseConfig = {
  apiKey: "AIzaSyDoTuxsIvAo_nlpDPznjud2IjXL1Nvmjec",
  authDomain: "flappybirdcst.firebaseapp.com",
  projectId: "flappybirdcst",
  storageBucket: "flappybirdcst.firebasestorage.app",
  messagingSenderId: "422450767019",
  appId: "1:422450767019:web:b7625d2850fbb3b7c3c3ee",
};

let db = null;
let initialized = false;

export function initFirebase() {
  if (initialized) return db;
  try {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    initialized = true;
  } catch (err) {
    console.warn('Firebase init failed:', err.message);
  }
  return db;
}

export function isFirebaseConfigured() {
  return firebaseConfig.apiKey !== 'YOUR_API_KEY';
}

/**
 * Players have no account/UID — a player is identified by the profile they enter:
 * name (case/spacing-insensitive) + role + department + year (students/lecturers) or batch (alumni).
 */
function normalizeName(name) {
  return String(name ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
}

function playerKeyParts({ name, role, department, year, batch }) {
  const r = role || 'student';
  return [normalizeName(name), r, department || '', (r === 'alumni' ? batch : year) || ''];
}

/**
 * Deterministic leaderboard document id: one document per player per mode, so replays update
 * the same record instead of adding a new one. ("/" is not allowed in Firestore ids.)
 */
export function playerDocId(player, mode) {
  return [mode, ...playerKeyParts(player)]
    .map((part) => String(part).replace(/\//g, '_'))
    .join('|')
    .slice(0, 700);
}

function playerKey(entry) {
  return [normalizeModeId(entry.mode), ...playerKeyParts(entry)].join('|');
}

/**
 * Best score from this player's older auto-id documents (created before one-record-per-player),
 * so their first deterministic record starts from their existing best. Read-only.
 */
async function findLegacyBestScore(player, mode) {
  try {
    const q = query(
      collection(db, 'leaderboard'),
      where('mode', '==', mode),
      where('name', '==', player.name),
    );
    const snapshot = await getDocs(q);
    const key = playerKey({ ...player, mode });
    return snapshot.docs
      .map((d) => d.data())
      .filter((d) => playerKey(d) === key)
      .reduce((best, d) => Math.max(best, Number(d.score) || 0), 0);
  } catch (err) {
    console.warn('Legacy score lookup skipped:', err.message);
    return 0;
  }
}

/**
 * Submit a score to the leaderboard. Each player has one record per mode; it keeps their best
 * score and is only rewritten when that best improves. The transaction makes concurrent submits
 * from the same player resolve to that single record without lowering the score.
 */
export async function submitScore({ name, role, department, year, batch, score, mode }) {
  if (!initFirebase() || !isFirebaseConfigured()) {
    console.warn('Firebase not configured — score not submitted');
    return null;
  }

  try {
    const player = { name, role: role || 'student', department, year: year || null, batch: batch || null };
    const docRef = doc(db, 'leaderboard', playerDocId(player, mode));

    const existing = await getDoc(docRef);
    const legacyBest = existing.exists() ? 0 : await findLegacyBestScore(player, mode);

    await runTransaction(db, async (tx) => {
      const snap = await tx.get(docRef);
      const previousBest = snap.exists() ? Number(snap.data().score) || 0 : legacyBest;
      if (snap.exists() && score <= previousBest) return;
      tx.set(docRef, {
        ...player,
        score: Math.max(score, previousBest),
        mode,
        timestamp: serverTimestamp(),
      });
    });
    return docRef.id;
  } catch (err) {
    console.error('Score submit failed:', err);
    return null;
  }
}

/** Keep only each player's highest entry (older data has several documents per player). */
function dedupeByPlayer(entries) {
  const seen = new Set();
  return entries.filter((entry) => {
    const key = playerKey(entry);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Fetch leaderboard entries with optional filters.
 * @param {Object} options
 * @param {string} options.modeId - Mode id (flappy_cst, journey, department)
 * @param {string} [options.department] - Filter by department
 * @param {string} [options.role] - Filter by role (student/lecturer)
 * @param {number} [options.topN=10]
 */
export async function getLeaderboard({ modeId, department, role, topN = 10 } = {}) {
  if (!initFirebase() || !isFirebaseConfigured()) {
    return [];
  }

  try {
    // Build query with available filters
    const constraints = [where('mode', '==', modeId)];

    if (modeId === 'department') {
      if (department) constraints.push(where('department', '==', department));
      if (role) constraints.push(where('role', '==', role));
    }

    constraints.push(orderBy('score', 'desc'));
    // Over-fetch so older duplicate documents don't crowd distinct players out of the top N
    constraints.push(limit(topN * 5));

    const q = query(collection(db, 'leaderboard'), ...constraints);
    const snapshot = await getDocs(q);

    const entries = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate?.() || null,
    }));
    return dedupeByPlayer(entries).slice(0, topN);
  } catch (err) {
    // Fallback: fetch more and filter client-side (no composite index needed)
    console.warn('Leaderboard query fallback:', err.message);
    return getLeaderboardFallback({ modeId, department, role, topN });
  }
}

/** Client-side filter fallback when Firestore composite index is missing */
async function getLeaderboardFallback({ modeId, department, role, topN }) {
  try {
    const q = query(collection(db, 'leaderboard'), orderBy('score', 'desc'), limit(100));
    const snapshot = await getDocs(q);

    let entries = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate?.() || null,
    }));

    entries = entries.filter((e) => normalizeModeId(e.mode) === modeId);

    if (modeId === 'department') {
      if (department) entries = entries.filter((e) => e.department === department);
      if (role) entries = entries.filter((e) => e.role === role);
    }

    return dedupeByPlayer(entries).slice(0, topN);
  } catch (err) {
    console.error('Leaderboard fetch failed:', err);
    return [];
  }
}
