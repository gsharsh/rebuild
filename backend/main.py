import os
import json
import time
from typing import Optional, Dict, Any
from uuid import UUID
from pathlib import Path

from fastapi import FastAPI, Depends, HTTPException, status, Header, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from supabase import create_client, Client
import elevenlabs

# Auto-load local credentials
current_dir = Path(__file__).parent
load_dotenv(dotenv_path=current_dir / ".env")

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_ANON_KEY = os.environ.get("SUPABASE_ANON_KEY")
ELEVENLABS_API_KEY = os.environ.get("ELEVENLABS_API_KEY")
ELEVENLABS_VOICE_ID = os.environ.get("ELEVENLABS_VOICE_ID", "21m00Tcm4TlvDq8ikWAM")

from coach_engine import analyze_interview_script

app = FastAPI(title="SpeakReady Engine", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

supabase_client: Client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
el_client = elevenlabs.ElevenLabs(api_key=ELEVENLABS_API_KEY) if ELEVENLABS_API_KEY else None

async def get_current_user_id(authorization: Optional[str] = Header(None)) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or malformed validation token.")
    token = authorization.split(" ")[1]
    try:
        return supabase_client.auth.get_user(token).user.id
    except Exception:
        raise HTTPException(status_code=401, detail="Token verification failed.")

class SessionCreate(BaseModel):
    interview_type: str
    role: str
    organisation: str
    context: Optional[str] = None

class QuestionCreate(BaseModel):
    session_id: UUID
    question_text: str
    source: Optional[str] = "generated"

class TextAnswerSubmit(BaseModel):
    question_id: UUID
    session_id: UUID
    original_text: str
    native_language: Optional[str] = "English"

class FrontendResponseContract(BaseModel):
    answer_id: UUID
    transcript: str
    speech_analysis: Dict[str, Any]
    script_analysis: Dict[str, Any]
    coach_audio_url: Optional[str] = None

def generate_coach_voice_memo(lesson_text: str, user_id: str, answer_id: str) -> Optional[str]:
    if not el_client: return None
    try:
        audio_generator = el_client.generate(text=lesson_text, model_id="eleven_flash_v2_5", voice_id=ELEVENLABS_VOICE_ID)
        storage_path = f"coach_memos/{user_id}/{answer_id}_feedback.mp3"
        supabase_client.storage.from_("speakready-media").upload(path=storage_path, file=b"".join(audio_generator), file_options={"content-type": "audio/mpeg", "x-upsert": "true"})
        return supabase_client.storage.from_("speakready-media").get_public_url(storage_path)
    except Exception: return None

@app.post("/api/sessions", status_code=201)
async def create_session(data: SessionCreate, user_id: str = Depends(get_current_user_id)):
    res = supabase_client.table("sessions").insert({**data.model_dump(), "user_id": user_id}).execute()
    return res.data[0]

@app.get("/api/sessions")
async def get_sessions(user_id: str = Depends(get_current_user_id)):
    res = supabase_client.table("sessions").select("*").eq("user_id", user_id).order("created_at", desc=True).execute()
    return res.data

@app.get("/api/sessions/{session_id}")
async def get_session_by_id(session_id: UUID, user_id: str = Depends(get_current_user_id)):
    res = supabase_client.table("sessions").select("*").eq("id", str(session_id)).eq("user_id", user_id).execute()
    if not res.data: raise HTTPException(status_code=404, detail="Entry not found.")
    return res.data[0]

@app.post("/api/questions", status_code=201)
async def create_question(data: QuestionCreate, user_id: str = Depends(get_current_user_id)):
    res = supabase_client.table("questions").insert(data.model_dump()).execute()
    return res.data[0]

@app.get("/api/sessions/{session_id}/questions")
async def get_session_questions(session_id: UUID, user_id: str = Depends(get_current_user_id)):
    res = supabase_client.table("questions").select("*").eq("session_id", str(session_id)).execute()
    return res.data

@app.post("/api/answers/analyze-text", response_model=FrontendResponseContract)
async def analyze_text_answer(data: TextAnswerSubmit, user_id: str = Depends(get_current_user_id)):
    session_res = supabase_client.table("sessions").select("*").eq("id", str(data.session_id)).eq("user_id", user_id).execute()
    if not session_res.data: raise HTTPException(status_code=404, detail="Session not found.")
    session_meta = session_res.data[0]

    question_res = supabase_client.table("questions").select("*").eq("id", str(data.question_id)).execute()
    session_meta["question_text"] = question_res.data[0]["question_text"] if question_res.data else "Tell me about yourself."

    script_analysis = analyze_interview_script(session_meta, data.original_text)
    speech_analysis = {"pacing_words_per_minute": 135, "energy_delivery_score": "Balanced", "hesitation_markers_detected": []}

    answer_payload = {
        "question_id": str(data.question_id), "session_id": str(data.session_id), "user_id": user_id,
        "original_text": data.original_text, "transcript": data.original_text, "native_language": data.native_language,
        "script_analysis": script_analysis, "speech_analysis": speech_analysis
    }
    db_res = supabase_client.table("answers").insert(answer_payload).execute()
    answer_record = db_res.data[0]

    coach_url = generate_coach_voice_memo(script_analysis["coaching_lesson"], user_id, answer_record["id"])
    if coach_url:
        supabase_client.table("answers").update({"audio_url": coach_url}).eq("id", answer_record["id"]).execute()

    return FrontendResponseContract(
        answer_id=answer_record["id"], transcript=data.original_text,
        speech_analysis=speech_analysis, script_analysis=script_analysis, coach_audio_url=coach_url
    )