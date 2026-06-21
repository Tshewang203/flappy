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
  addDoc,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { MODES } from './config/constants.js';

const firebaseConfig = {
  apiKey: 'YOUR_API_KEY',
  authDomain: 'YOUR_PROJECT.firebaseapp.com',
  projectId: 'YOUR_PROJECT_ID',
  storageBucket: 'YOUR_PROJECT.appspot.com',
  messagingSenderId: 'YOUR_SENDER_ID',
  appId: 'YOUR_APP_ID',
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
 * Submit a score to the leaderboard.
 */
export async function submitScore({ name, role, department, year, score, mode }) {
  if (!initFirebase() || !isFirebaseConfigured()) {
    console.warn('Firebase not configured — score not submitted');
    return null;
  }

  try {
    const docRef = await addDoc(collection(db, 'leaderboard'), {
      name,
      role: role || 'student',
      department,
      year: year || 'Lecturer',
      score,
      mode,
      timestamp: serverTimestamp(),
    });
    return docRef.id;
  } catch (err) {
    console.error('Score submit failed:', err);
    return null;
  }
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

  const modeInfo = Object.values(MODES).find((m) => m.id === modeId);
  const modeName = modeInfo?.name || modeId;

  try {
    // Build query with available filters
    const constraints = [where('mode', '==', modeName)];

    if (modeId === 'department') {
      if (department) constraints.push(where('department', '==', department));
      if (role) constraints.push(where('role', '==', role));
    }

    constraints.push(orderBy('score', 'desc'));
    constraints.push(limit(topN));

    const q = query(collection(db, 'leaderboard'), ...constraints);
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate?.() || null,
    }));
  } catch (err) {
    // Fallback: fetch more and filter client-side (no composite index needed)
    console.warn('Leaderboard query fallback:', err.message);
    return getLeaderboardFallback({ modeId, department, role, topN });
  }
}

/** Client-side filter fallback when Firestore composite index is missing */
async function getLeaderboardFallback({ modeId, department, role, topN }) {
  try {
    const modeInfo = Object.values(MODES).find((m) => m.id === modeId);
    const modeName = modeInfo?.name || modeId;

    const q = query(collection(db, 'leaderboard'), orderBy('score', 'desc'), limit(100));
    const snapshot = await getDocs(q);

    let entries = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate?.() || null,
    }));

    entries = entries.filter((e) => e.mode === modeName);

    if (modeId === 'department') {
      if (department) entries = entries.filter((e) => e.department === department);
      if (role) entries = entries.filter((e) => e.role === role);
    }

    return entries.slice(0, topN);
  } catch (err) {
    console.error('Leaderboard fetch failed:', err);
    return [];
  }
}
