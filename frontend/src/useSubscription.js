// ============================================================
//  useSubscription.js — RoutineState Manager
//  Stub implementation: mirrors full Firebase + Play Billing API.
//  To activate real billing:
//    1. Add your Firebase web config to src/firebase.js
//    2. Replace the stub state with Firestore reads
//    3. Replace subscribe() body with Digital Goods API call
// ============================================================

import { useState, useEffect, useCallback } from 'react';

// ---------------------------------------------------------------------------
// STUB STATE — replace with Firestore document when credentials are ready
// ---------------------------------------------------------------------------
const STUB_STATE = {
  isSubscribed: false,        // TODO: read from Firestore users/{uid}/isSubscribed
  subscriptionId: null,       // TODO: Razorpay/Play subscription ID
  expiryAt: null,             // TODO: Firestore timestamp
  graceUntil: null,           // expiryAt + 48 h
  lastSyncAt: null,
  cachedRoutineVersion: null,
};

// Grace window in milliseconds (48 hours)
const GRACE_MS = 48 * 60 * 60 * 1000;

export function useSubscription() {
  const [state, setState] = useState(STUB_STATE);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState(null);

  // ── Computed properties ──────────────────────────────────────────────────
  const now         = Date.now();
  const inGrace     = !state.isSubscribed
                      && state.graceUntil
                      && now < new Date(state.graceUntil).getTime();
  const isOffline   = !state.lastSyncAt ? false
                      : (now - new Date(state.lastSyncAt).getTime()) > 14 * 24 * 60 * 60 * 1000;

  // ── checkSubscription ────────────────────────────────────────────────────
  // TODO: replace with Firestore onSnapshot listener
  const checkSubscription = useCallback(async () => {
    setLoading(true);
    try {
      // STUB: in real app, read from Firestore
      // const doc = await getDoc(doc(db, 'users', uid));
      // setState(doc.data());
      setState(prev => ({ ...prev, lastSyncAt: new Date().toISOString() }));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { checkSubscription(); }, [checkSubscription]);

  // ── refreshSubscription ──────────────────────────────────────────────────
  const refreshSubscription = useCallback(async () => {
    await checkSubscription();
  }, [checkSubscription]);

  // ── subscribe ─────────────────────────────────────────────────────────────
  // TODO: replace stub with Digital Goods API for Play Store
  // Real flow:
  //   const service = await window.getDigitalGoodsService('https://play.google.com/billing');
  //   const details = await service.getDetails(['svmgpt_routine_monthly']);
  //   await service.purchase(details[0]);
  //   Verify via POST /api/subscription/verify → Firestore isSubscribed=true
  const subscribe = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // ── STUB: simulate successful purchase ──────────────────────────────
      await new Promise(r => setTimeout(r, 1500)); // simulate network delay
      const expiry    = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const graceEnd  = new Date(expiry.getTime() + GRACE_MS);
      const newState  = {
        isSubscribed: true,
        subscriptionId: 'stub_' + Date.now(),
        expiryAt: expiry.toISOString(),
        graceUntil: graceEnd.toISOString(),
        lastSyncAt: new Date().toISOString(),
        cachedRoutineVersion: 'v1',
      };
      // TODO: await POST('/api/subscription/verify', { purchaseToken })
      // TODO: Firestore will update; read back via onSnapshot
      setState(newState);
      return { success: true };
    } catch (e) {
      setError(e.message);
      return { success: false, error: e.message };
    } finally {
      setLoading(false);
    }
  }, []);

  // ── revokeSubscription ───────────────────────────────────────────────────
  const revokeSubscription = useCallback(async () => {
    setLoading(true);
    try {
      // TODO: POST /api/subscription/revoke
      //       Firestore: isSubscribed=false, graceUntil = expiryAt + 48h
      setState({ ...STUB_STATE });
    } finally {
      setLoading(false);
    }
  }, []);

  // ── setSubscription (from external purchase result) ──────────────────────
  const setSubscription = useCallback((purchase) => {
    const expiry   = new Date(purchase.expiryAt);
    const graceEnd = new Date(expiry.getTime() + GRACE_MS);
    setState({
      isSubscribed: true,
      subscriptionId: purchase.subscriptionId,
      expiryAt: expiry.toISOString(),
      graceUntil: graceEnd.toISOString(),
      lastSyncAt: new Date().toISOString(),
      cachedRoutineVersion: purchase.version ?? 'v1',
    });
  }, []);

  return {
    ...state,
    inGrace,
    isOffline,
    loading,
    error,
    checkSubscription,
    refreshSubscription,
    subscribe,
    revokeSubscription,
    setSubscription,
  };
}
