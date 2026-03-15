// ============================================================
//  useSubscription.js — RoutineState Manager (Firebase + Firestore)
//  Reads/writes: users/{uid}/subscriptionState in Firestore
//
//  Auth strategy:
//    1. Try Firebase Anonymous Sign-In (requires Anonymous Auth enabled in Firebase Console)
//    2. If that fails, use a stable device UUID stored in localStorage
//       → subscription persists across refreshes on the same device
//       → cross-device sync requires enabling Anonymous Auth or Google Sign-In
// ============================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import { auth, db, onAuthStateChanged } from './firebase';
import { signInAnonymously } from 'firebase/auth';
import {
  doc, getDoc, setDoc, onSnapshot, serverTimestamp
} from 'firebase/firestore';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api';

const GRACE_MS   = 48 * 60 * 60 * 1000;
const OFFLINE_MS = 14 * 24 * 60 * 60 * 1000;

const DEFAULT_STATE = {
  isSubscribed:         false,
  subscriptionId:       null,
  expiryAt:             null,
  graceUntil:           null,
  lastSyncAt:           null,
  cachedRoutineVersion: null,
  chatBalance:          7,
};

// ── Helper: get or create a stable device UUID (localStorage fallback) ───────
function getDeviceUid() {
  const KEY = 'svmgpt_device_uid';
  let uid = localStorage.getItem(KEY);
  if (!uid) {
    uid = 'device_' + crypto.randomUUID();
    localStorage.setItem(KEY, uid);
  }
  return uid;
}

// ── Helper: resolve auth uid (Firebase auth preferred, device fallback) ──────
async function resolveUid() {
  try {
    // Try Firebase anonymous auth
    const user = auth.currentUser ?? (await signInAnonymously(auth)).user;
    return user.uid;
  } catch {
    // Firebase Anonymous Auth not enabled — use localStorage device UUID
    console.warn('Firebase anonymous auth unavailable; using device UUID for Firestore key.');
    return getDeviceUid();
  }
}

function toDate(v) {
  if (!v) return null;
  if (v?.toDate) return v.toDate();
  return new Date(v);
}

function stateFromDoc(data) {
  if (!data) return DEFAULT_STATE;
  return {
    isSubscribed:         data.isSubscribed         ?? false,
    subscriptionId:       data.subscriptionId        ?? null,
    expiryAt:             toDate(data.expiryAt),
    graceUntil:           toDate(data.graceUntil),
    lastSyncAt:           toDate(data.lastSyncAt),
    cachedRoutineVersion: data.cachedRoutineVersion  ?? null,
    chatBalance:          data.chatBalance ?? 7,
  };
}

// ── Hook ────────────────────────────────────────────────────────────────────

export function useSubscription() {
  const [uid, setUid]         = useState(null);
  const [state, setState]     = useState(DEFAULT_STATE);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const unsubRef              = useRef(null);

  // ── Step 1: Resolve uid (Firebase auth OR device UUID) ──
  useEffect(() => {
    resolveUid().then(setUid).catch((e) => {
      setError('Auth error: ' + e.message);
      setLoading(false);
    });
  }, []);

  // ── Step 2: Listen to Firestore once uid is known ────────
  useEffect(() => {
    if (!uid) return;
    const ref = doc(db, 'users', uid);
    unsubRef.current = onSnapshot(
      ref,
      (snap) => { setState(stateFromDoc(snap.data())); setLoading(false); },
      (e)    => { setError(e.message); setLoading(false); }
    );
    return () => { if (unsubRef.current) unsubRef.current(); };
  }, [uid]);

  // ── Computed ─────────────────────────────────────────────
  const now     = Date.now();
  const inGrace = !state.isSubscribed && state.graceUntil
                  && now < new Date(state.graceUntil).getTime();
  const isOffline = state.lastSyncAt
                    ? (now - new Date(state.lastSyncAt).getTime()) > OFFLINE_MS
                    : false;

  // ── checkSubscription ─────────────────────────────────────
  const checkSubscription = useCallback(async () => {
    if (!uid) return;
    setLoading(true);
    try {
      const snap = await getDoc(doc(db, 'users', uid));
      setState(stateFromDoc(snap.data()));
    } catch (e) { setError(e.message); }
    finally    { setLoading(false); }
  }, [uid]);

  const refreshSubscription = checkSubscription;

  // ── subscribe — Play Billing trigger ────────────────────────────────────
  // TODO (when SKU ready): replace stub body with Digital Goods API:
  //   const svc = await window.getDigitalGoodsService('https://play.google.com/billing');
  //   const [sku] = await svc.getDetails(['svmgpt_routine_monthly']);
  //   const { id: purchaseToken } = await svc.purchase(sku);
  //   await fetch(`${API_BASE_URL}/subscription/verify`, {
  //     method: 'POST', headers: {'Content-Type':'application/json'},
  //     body: JSON.stringify({ uid, purchaseToken, productId: 'svmgpt_routine_monthly' })
  //   });
  //   Firestore onSnapshot will pick up isSubscribed=true automatically.
  const subscribe = useCallback(async (productId = 'svmgpt_routine_monthly') => {
    if (!uid) return { success: false, error: 'Not authenticated' };
    setLoading(true);
    setError(null);
    try {
      await new Promise(r => setTimeout(r, 1500)); // simulate Play Billing delay
      const purchaseToken = 'stub_' + Date.now();
      
      const res = await fetch(`${API_BASE_URL}/subscription/verify`, {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid, purchaseToken, productId })
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Verification failed');
      }
      
      // Firestore onSnapshot will pick up isSubscribed=true automatically.
      return { success: true };
    } catch (e) {
      setError(e.message);
      return { success: false, error: e.message };
    } finally {
      setLoading(false);
    }
  }, [uid]);

  // ── revokeSubscription ────────────────────────────────────────────────────
  const revokeSubscription = useCallback(async () => {
    if (!uid) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/subscription/revoke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Revoke failed');
      }
    } catch (e) { 
      setError(e.message); 
    } finally { 
      setLoading(false); 
    }
  }, [uid]);

  return {
    uid, ...state, inGrace, isOffline, loading, error,
    checkSubscription, refreshSubscription, subscribe, revokeSubscription,
  };
}
