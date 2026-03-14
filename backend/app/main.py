from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
import os
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

class ChatRequest(BaseModel):
    message: str

@app.on_event("startup")
async def startup_event():
    # Initialize RAG engine and load knowledge base
    rag_engine.initialize()

@app.post("/api/chat")
async def chat(request: ChatRequest):
    response = rag_engine.chat(request.message)
    return {"reply": response}

@app.get("/api/routines")
async def get_routines():
    # Gets the current hourly routine/quote
    routine = get_routine_for_time()
    return routine

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
