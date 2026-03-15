// ============================================================
//  firebase.js — Firebase initialization for SvmGpt
//  Project: svmgpt-c4902
// ============================================================

import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics } from 'firebase/analytics';

const firebaseConfig = {
  apiKey:            "AIzaSyCMGnPi0PFk15DjzVfu-ruOzZu_REfbLZQ",
  authDomain:        "svmgpt-c4902.firebaseapp.com",
  projectId:         "svmgpt-c4902",
  storageBucket:     "svmgpt-c4902.firebasestorage.app",
  messagingSenderId: "279129190628",
  appId:             "1:279129190628:web:d8c4b32668f80348eafcf1",
  measurementId:     "G-9B7CLS13CS",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Auth — anonymous sign-in so every browser gets a stable uid
export const auth = getAuth(app);

// Firestore — subscription state lives at users/{uid}
export const db = getFirestore(app);

// Analytics (optional)
let analytics = null;
if (typeof window !== 'undefined') {
  analytics = getAnalytics(app);
}
export { analytics };

// ── Helper: sign in anonymously if not already ──────────────
export async function ensureAuth() {
  if (auth.currentUser) return auth.currentUser;
  const cred = await signInAnonymously(auth);
  return cred.user;
}

export { onAuthStateChanged };
