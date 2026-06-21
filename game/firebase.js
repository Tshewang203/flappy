/**
 * Firebase Firestore leaderboard integration.
 *
 * SETUP:
 * 1. Create a Firebase project at https://console.firebase.google.com
 * 2. Enable Firestore Database
 * 3. Replace the firebaseConfig object below with your project credentials
 * 4. Set Firestore rules (development example):
 *
 *    rules_version = '2';
 *    service cloud.firestore {
 *      match /databases/{database}/documents {
 *        match /leaderboard/{doc} {
 *          allow read: if true;
 *          allow create: if request.resource.data.score is int
 *                        && request.resource.data.score >= 0
 *                        && request.resource.data.score <= 99999;
 *        }
 *      }
 *    }
 */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import {
  getFirestore,
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  getDocs,
  serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

// ── Replace with your Firebase project config ──
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

/** Initialize Firebase (safe to call multiple times) */
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

/** Check if Firebase is configured with real credentials */
export function isFirebaseConfigured() {
  return firebaseConfig.apiKey !== 'YOUR_API_KEY';
}

/**
 * Submit a score to the leaderboard
 * @returns {Promise<string|null>} document ID or null on failure
 */
export async function submitScore({ name, department, year, score, mode }) {
  if (!initFirebase() || !isFirebaseConfigured()) {
    console.warn('Firebase not configured — score not submitted');
    return null;
  }

  try {
    const docRef = await addDoc(collection(db, 'leaderboard'), {
      name,
      department,
      year,
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
 * Fetch top N leaderboard entries
 * @returns {Promise<Array>}
 */
export async function getLeaderboard(topN = 10) {
  if (!initFirebase() || !isFirebaseConfigured()) {
    return [];
  }

  try {
    const q = query(
      collection(db, 'leaderboard'),
      orderBy('score', 'desc'),
      limit(topN)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate?.() || null,
    }));
  } catch (err) {
    console.error('Leaderboard fetch failed:', err);
    return [];
  }
}
