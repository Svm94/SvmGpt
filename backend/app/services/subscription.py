"""
subscription.py — Subscription state manager (Firebase Admin + Firestore)

Endpoints:
  POST /api/subscription/verify  — verify Play purchase, write isSubscribed=true to Firestore
  GET  /api/subscription/status  — return current RoutineState for a uid
  POST /api/subscription/revoke  — revoke subscription (set isSubscribed=false)

TODO: when Play Console SKU is ready:
  1. Add GOOGLE_APPLICATION_CREDENTIALS env var (path to service account JSON)
     OR set FIREBASE_SERVICE_ACCOUNT_JSON env var with the JSON content directly.
  2. Replace stub verify logic with Google Play Developer API call.
"""

import os
import json
import datetime
from dataclasses import dataclass, asdict
from typing import Optional
from google.oauth2 import service_account
from googleapiclient.discovery import build

# Firebase Admin is initialized only once (in main.py via init_firebase())
import firebase_admin
from firebase_admin import credentials, firestore

# Constants - Update these with your real Play Store details
PACKAGE_NAME = "com.svmgpt.app"  # Your Package Name
SCOPES = ['https://www.googleapis.com/auth/androidpublisher']

# ── Grace / TTL constants ────────────────────────────────────────────────────
GRACE_HOURS   = 48          # hours after expiry before access is cut off
OFFLINE_DAYS  = 14          # days before cached routines are considered stale

# ── RoutineState dataclass ────────────────────────────────────────────────────

@dataclass
class RoutineState:
    is_subscribed:           bool
    subscription_id:         Optional[str]
    expiry_at:               Optional[datetime.datetime]
    grace_until:             Optional[datetime.datetime]   # expiry_at + 48 h
    last_sync_at:            Optional[datetime.datetime]
    cached_routine_version:  Optional[str]
    chat_balance:            int

    @property
    def in_grace(self) -> bool:
        if self.is_subscribed:
            return False
        if not self.grace_until:
            return False
        return datetime.datetime.now(datetime.timezone.utc) < self.grace_until

    def to_dict(self) -> dict:
        d = asdict(self)
        d['in_grace'] = self.in_grace
        # Convert datetimes to ISO strings for JSON
        for k in ('expiry_at', 'grace_until', 'last_sync_at'):
            if d[k]:
                d[k] = d[k].isoformat()
        return d


# ── Firestore helpers ─────────────────────────────────────────────────────────

def _is_firebase_initialized() -> bool:
    try:
        return bool(firebase_admin._apps)
    except AttributeError:
        return False

def _get_db():
    """Return Firestore client (requires firebase_admin already initialized)."""
    if not _is_firebase_initialized():
        raise RuntimeError("Firebase Admin is not initialized")
    return firestore.client()

def _user_ref(uid: str):
    return _get_db().collection('users').document(uid)


def _doc_to_state(data: dict) -> RoutineState:
    """Convert a Firestore document dict to RoutineState."""
    def _dt(v):
        if v is None:
            return None
        if hasattr(v, 'timestamp'):  # Firestore DatetimeWithNanoseconds
            return v
        return datetime.datetime.fromisoformat(str(v))

    return RoutineState(
        is_subscribed           = data.get('isSubscribed', False),
        subscription_id         = data.get('subscriptionId'),
        expiry_at               = _dt(data.get('expiryAt')),
        grace_until             = _dt(data.get('graceUntil')),
        last_sync_at            = _dt(data.get('lastSyncAt')),
        cached_routine_version  = data.get('cachedRoutineVersion'),
        chat_balance            = data.get('chatBalance', 7),
    )


# ── Core methods ──────────────────────────────────────────────────────────────

def get_subscription_state(uid: str) -> RoutineState:
    """Read subscription state from Firestore."""
    fallback_state = RoutineState(
        is_subscribed=False,
        subscription_id=None,
        expiry_at=None,
        grace_until=None,
        last_sync_at=None,
        cached_routine_version=None,
        chat_balance=7,
    )
    if not _is_firebase_initialized():
        print("Warning: Firebase Admin not initialized, returning fallback state in get_subscription_state")
        return fallback_state

    try:
        snap = _user_ref(uid).get()
        if not snap.exists:
            return fallback_state
        return _doc_to_state(snap.to_dict())
    except Exception as e:
        print(f"Warning: Firebase Admin error in get_subscription_state. Error: {e}")
        return fallback_state


def set_subscription(uid: str, subscription_id: str, duration_days: int = 30) -> RoutineState:
    """
    Activate subscription in Firestore.
    Called after successful Play Billing purchase verification.
    """
    now       = datetime.datetime.now(datetime.timezone.utc)
    expiry    = now + datetime.timedelta(days=duration_days)
    grace     = expiry + datetime.timedelta(hours=GRACE_HOURS)

    data = {
        'isSubscribed':          True,
        'subscriptionId':        subscription_id,
        'expiryAt':              expiry,
        'graceUntil':            grace,
        'lastSyncAt':            now,
        'cachedRoutineVersion':  'v1',
    }
    
    if not _is_firebase_initialized():
        print("Warning: Firebase Admin not initialized, skipping set_subscription Firestore write.")
        state = _doc_to_state(data)
        return state

    try:
        data['lastSyncAt'] = firestore.SERVER_TIMESTAMP
        _user_ref(uid).set(data, merge=True)
        return _doc_to_state({**data, 'lastSyncAt': now})
    except Exception as e:
        print(f"Warning: Firebase Admin error in set_subscription. Error: {e}")
        state = _doc_to_state(data)
        return state


def revoke_subscription(uid: str) -> RoutineState:
    """Revoke subscription — sets isSubscribed=False, grace window stays."""
    state = get_subscription_state(uid)
    now   = datetime.datetime.now(datetime.timezone.utc)
    grace = (state.expiry_at + datetime.timedelta(hours=GRACE_HOURS)
             if state.expiry_at else now)
    if not _is_firebase_initialized():
        print("Warning: Firebase Admin not initialized, skipping revoke_subscription Firestore write.")
        state.is_subscribed = False
        state.grace_until = grace
        return state

    try:
        _user_ref(uid).set({
            'isSubscribed': False,
            'graceUntil':   grace,
            'lastSyncAt':   firestore.SERVER_TIMESTAMP,
        }, merge=True)
    except Exception as e:
        print(f"Warning: Firebase Admin error in revoke_subscription. Error: {e}")
        
    return get_subscription_state(uid)


def add_chat_balance(uid: str, amount: int) -> RoutineState:
    """Adds consumable tokens to the user's chat balance."""
    if not _is_firebase_initialized():
        print("Warning: Firebase Admin not initialized, skipping add_chat_balance Firestore write.")
        state = get_subscription_state(uid)
        state.chat_balance += amount
        return state

    try:
        ref = _user_ref(uid)
        snap = ref.get()
        
        if not snap.exists:
            # Document does not exist, initialize it with default + amount
            ref.set({'chatBalance': 7 + amount}, merge=True)
        else:
            # Document exists, increment it using firestore atomic operation
            ref.set({'chatBalance': firestore.Increment(amount)}, merge=True)
    except Exception as e:
        print(f"Warning: Firebase Admin error in add_chat_balance. Error: {e}")
        
    return get_subscription_state(uid)

def decrement_chat_balance(uid: str) -> bool:
    """
    Deducts 1 chat from the user's balance.
    Returns True if allowed (either they have unlimited subscription OR balance > 0).
    Returns False if balance is 0 and they are not subscribed.
    """
    if not _is_firebase_initialized():
        print("Warning: Firebase Admin not initialized, allowing chat without decrement.")
        return True

    try:
        ref = _user_ref(uid)
        snap = ref.get()
        
        if not snap.exists:
            # First time user. Default balance 7. Decrement by 1 leaves 6.
            ref.set({'chatBalance': 6}, merge=True)
            return True
            
        state = _doc_to_state(snap.to_dict())
        
        # Unlimited for subscribed users
        if state.is_subscribed:
            return True
            
        # Check balance
        if state.chat_balance <= 0:
            return False
            
        # Decrement balance atomically
        ref.set({'chatBalance': firestore.Increment(-1)}, merge=True)
        return True
    except Exception as e:
        print(f"Warning: Firebase Admin error in decrement_chat_balance. Falling back to allow chat. Error: {e}")
        return True


def verify_google_play_purchase(purchase_token, product_id, is_subscription=False):
    """
    Connects to Google Play Developer API to verify the actual purchase.
    """
    try:
        # 1. Authenticate using your existing Service Account Key
        key_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS", "serviceAccountKey.json")
        creds = service_account.Credentials.from_service_account_file(key_path, scopes=SCOPES)
        service = build('androidpublisher', 'v3', credentials=creds)

        if is_subscription:
            # Verify Monthly Plan (₹500)
            result = service.purchases().subscriptions().get(
                packageName=PACKAGE_NAME,
                subscriptionId=product_id,
                token=purchase_token
            ).execute()
            
            # Check if subscription is active (paymentState 1 = Received)
            return result.get("paymentState") == 1
        else:
            # Verify Consumables (₹50 or ₹200)
            result = service.purchases().products().get(
                packageName=PACKAGE_NAME,
                productId=product_id,
                token=purchase_token
            ).execute()
            
            # Check if purchaseState 0 = Purchased
            if result.get("purchaseState") == 0:
                # IMPORTANT: For consumables, you should also "Acknowledge" 
                # or "Consume" the purchase so it doesn't get refunded.
                service.purchases().products().acknowledge(
                    packageName=PACKAGE_NAME,
                    productId=product_id,
                    token=purchase_token,
                    body={}
                ).execute()
                return True
            
        return False

    except Exception as e:
        print(f"Google Verification Error: {e}")
        return False

def verify_play_purchase(uid: str, purchase_token: str, product_id: str) -> dict:
    """
    Verify a Google Play purchase token using the Play Developer API.
    """
    is_sub = (product_id == 'svmgpt_routine_monthly')
    is_valid = verify_google_play_purchase(purchase_token, product_id, is_subscription=is_sub)

    if not is_valid:
        raise ValueError("Invalid Purchase Token")

    if product_id == 'svmgpt_routine_monthly':
        state = set_subscription(uid, subscription_id=purchase_token, duration_days=30)
    elif product_id == 'svmgpt_chat_50':
        state = add_chat_balance(uid, 20)
    elif product_id == 'svmgpt_chat_200':
        state = add_chat_balance(uid, 50)
    else:
        # Fallback just in case
        state = set_subscription(uid, subscription_id=purchase_token, duration_days=30)
        
    return {'verified': True, 'state': state.to_dict()}
