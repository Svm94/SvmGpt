from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
import os
import json
from dotenv import load_dotenv

from app.core.engine import RAGEngine
from app.services.routines import get_routine_for_time

load_dotenv()

app = FastAPI(title="Gita Chatbot API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

rag_engine = RAGEngine()

# ── Firebase Admin initializer ───────────────────────────────────────────────
def init_firebase():
    """
    Initialize Firebase Admin SDK.
    Reads service account from FIREBASE_SERVICE_ACCOUNT_JSON env var (JSON string)
    or falls back to GOOGLE_APPLICATION_CREDENTIALS (path to JSON file).
    Set FIREBASE_SERVICE_ACCOUNT_JSON in your .env or Render environment.
    """
    try:
        import firebase_admin
        from firebase_admin import credentials

        if firebase_admin._apps:
            return  # Already initialized

        sa_json = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")
        if sa_json:
            cred = credentials.Certificate(json.loads(sa_json))
        else:
            cred_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
            if cred_path:
                cred = credentials.Certificate(cred_path)
            else:
                # Application Default Credentials (works on GCP / local with gcloud auth)
                cred = credentials.ApplicationDefault()

        firebase_admin.initialize_app(cred)
        print("SUCCESS: Firebase Admin initialized")
    except Exception as e:
        print(f"WARNING: Firebase Admin not available: {e} - subscription endpoints will be limited")


# ── Models ───────────────────────────────────────────────────────────────────

class ChatRequest(BaseModel):
    uid:     str
    message: str

class VerifyRequest(BaseModel):
    uid:           str
    purchaseToken: str
    productId:     str

class RevokeRequest(BaseModel):
    uid: str

# ── Startup ──────────────────────────────────────────────────────────────────

@app.on_event("startup")
async def startup_event():
    rag_engine.initialize()
    init_firebase()

# ── Existing endpoints ───────────────────────────────────────────────────────

@app.post("/api/chat")
async def chat(request: ChatRequest):
    try:
        from app.services.subscription import decrement_chat_balance
        if not decrement_chat_balance(request.uid):
            raise HTTPException(status_code=403, detail="Exhausted Divine Insights. Please refill to continue.")
            
        response = rag_engine.chat(request.message)
        return {"reply": response}
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/routines")
async def get_routines():
    routine = get_routine_for_time()
    return routine

# ── Subscription endpoints ───────────────────────────────────────────────────

@app.post("/api/subscription/verify")
async def verify_subscription(req: VerifyRequest):
    """
    Verifies a Google Play purchase token and writes isSubscribed=true to Firestore.
    Frontend calls this after a successful Play Billing purchase.
    """
    try:
        from app.services.subscription import verify_play_purchase
        result = verify_play_purchase(req.uid, req.purchaseToken, req.productId)
        return result
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/subscription/status")
async def subscription_status(uid: str):
    """Returns the current RoutineState for a user uid."""
    try:
        from app.services.subscription import get_subscription_state
        state = get_subscription_state(uid)
        return state.to_dict()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/subscription/revoke")
async def revoke_subscription_endpoint(req: RevokeRequest):
    """Revokes a subscription (sets isSubscribed=false in Firestore)."""
    try:
        from app.services.subscription import revoke_subscription
        state = revoke_subscription(req.uid)
        return state.to_dict()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
