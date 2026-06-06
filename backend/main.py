import json
import os
import time
from typing import Any, Optional
from uuid import UUID

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, File, Form, Header, HTTPException, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from google import genai
from google.genai import types
from google.genai.errors import ServerError
from pydantic import BaseModel
from supabase import Client, create_client

try:
    import elevenlabs
except Exception:  # pragma: no cover - optional in demo mode
    elevenlabs = None

load_dotenv(".env")
load_dotenv("../.env")

SUPABASE_URL = os.environ.get("SUPABASE_URL") or os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_ANON_KEY = os.environ.get("SUPABASE_ANON_KEY") or os.environ.get(
    "NEXT_PUBLIC_SUPABASE_ANON_KEY"
)
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
ELEVENLABS_API_KEY = os.environ.get("ELEVENLABS_API_KEY")
ELEVENLABS_VOICE_ID = os.environ.get("ELEVENLABS_VOICE_ID", "21m00Tcm4TlvDq8ikWAM")

if not SUPABASE_URL or not SUPABASE_ANON_KEY:
    raise RuntimeError("Missing Supabase URL/key. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.")

supabase_admin: Client = create_client(
    SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY
)
supabase_auth: Client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
gemini_client = genai.Client(api_key=GEMINI_API_KEY) if GEMINI_API_KEY else None
eleven_client = (
    elevenlabs.ElevenLabs(api_key=ELEVENLABS_API_KEY)
    if elevenlabs and ELEVENLABS_API_KEY
    else None
)

app = FastAPI(title="SpeakReady Engine", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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


async def get_current_user_id(authorization: Optional[str] = Header(None)) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or malformed Authorization token.",
        )
    token = authorization.split(" ", 1)[1]
    try:
        user_info = supabase_auth.auth.get_user(token)
        if not user_info.user:
            raise ValueError("No user")
        return user_info.user.id
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User token verification failed or expired.",
        ) from exc


def safe_json(text: str) -> dict[str, Any]:
    cleaned = text.replace("```json", "").replace("```", "").strip()
    return json.loads(cleaned)


def fallback_script(text: str) -> dict[str, Any]:
    return {
        "improved_script": text,
        "changes_made": [
            {
                "original": text[:120],
                "fixed": text[:120],
                "reason": "Demo fallback kept your original answer because AI coaching was unavailable.",
            }
        ],
        "coaching_lesson": "Open with a direct answer, use shorter sentences, and connect your example back to the opportunity.",
    }


def analyze_script(role: str, org: str, question: str, text: str) -> dict[str, Any]:
    if not gemini_client:
        return fallback_script(text)

    system_instruction = """
You are SpeakReady's supportive Script Coach for multilingual, first-generation, immigrant, and under-coached students.
Do not frame feedback as accent fixing or bad English. Focus on clearer delivery, listener-friendly phrasing, and interview readiness.
Return JSON only:
{
  "improved_script": "Polished text structured for natural spoken delivery.",
  "changes_made": [{"original": "str", "fixed": "str", "reason": "str"}],
  "coaching_lesson": "Short explanation helping the student learn the improvement."
}
"""
    prompt = f"Role: {role} | Organisation: {org}\nQuestion: {question}\nAnswer: {text}"
    config = types.GenerateContentConfig(
        system_instruction=system_instruction,
        response_mime_type="application/json",
        temperature=0.3,
    )

    for model in ("gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-2.0-flash"):
        for attempt in range(3):
            try:
                response = gemini_client.models.generate_content(
                    model=model, contents=prompt, config=config
                )
                return safe_json(response.text)
            except ServerError:
                time.sleep(2**attempt)
            except Exception:
                break

    return fallback_script(text)


FILLER_MARKERS = [
    "um",
    "uh",
    "like",
    "you know",
    "basically",
    "actually",
    "literally",
    "i mean",
    "sort of",
    "kind of",
    "maybe",
    "right",
    "so",
]

CONFIDENCE_MARKERS = ["i think", "maybe", "kind of", "sort of", "just", "hopefully"]


def count_phrase(text: str, phrase: str) -> int:
    padded = f" {text.lower()} "
    return padded.count(f" {phrase.lower()} ")


def split_sentences(text: str) -> list[str]:
    normalised = " ".join(text.split())
    if not normalised:
        return []
    sentences: list[str] = []
    current = []
    for char in normalised:
        current.append(char)
        if char in ".!?":
            sentence = "".join(current).strip()
            if sentence:
                sentences.append(sentence)
            current = []
    trailing = "".join(current).strip()
    if trailing:
        sentences.append(trailing)
    return sentences


def repeated_words(text: str) -> list[str]:
    words = [word.strip(".,!?;:\"'()[]{}").lower() for word in text.split()]
    repeats = []
    for index in range(1, len(words)):
        if words[index] and words[index] == words[index - 1]:
            repeats.append(f"{words[index]} {words[index]}")
    return sorted(set(repeats))


def pace_label(wpm: int) -> str:
    if wpm < 110:
        return "too_slow"
    if wpm <= 155:
        return "good"
    if wpm <= 185:
        return "slightly_fast"
    return "too_fast"


def speech_metrics(text: str, duration_seconds: float = 0) -> dict[str, Any]:
    words = len(text.split())
    minutes = duration_seconds / 60 if duration_seconds > 0 else max(words / 145, 1 / 60)
    wpm = int(round(words / minutes)) if words else 0
    lowered = text.lower()
    filler_hits = [
        marker
        for marker in FILLER_MARKERS
        for _ in range(count_phrase(lowered, marker))
    ]
    confidence_hits = [
        marker for marker in CONFIDENCE_MARKERS if count_phrase(lowered, marker) > 0
    ]
    repeated = repeated_words(text)
    long_sentences = [
        sentence for sentence in split_sentences(text) if len(sentence.split()) >= 32
    ]
    struggle_sentences = []
    for sentence in split_sentences(text):
        reasons = []
        if sum(count_phrase(sentence, marker) for marker in FILLER_MARKERS) >= 2:
            reasons.append("multiple filler words")
        if any(count_phrase(sentence, marker) > 0 for marker in CONFIDENCE_MARKERS):
            reasons.append("hesitation phrases")
        if repeated_words(sentence):
            reasons.append("repeated words")
        if len(sentence.split()) >= 32:
            reasons.append("a long sentence")
        if reasons:
            struggle_sentences.append(
                {
                    "sentence": sentence,
                    "reason": f"Contains {', '.join(reasons)}.",
                    "severity": "high" if len(reasons) >= 2 else "medium",
                }
            )

    label = pace_label(wpm)
    filler_per_minute = round(len(filler_hits) / minutes, 1) if minutes else 0
    suggestions = [
        "Your pace is in a strong interview range."
        if label == "good"
        else "Adjust your pace during the opening so the interviewer can follow your main point.",
        "Replace filler words with a short pause. Pauses sound more confident.",
        "Remove softening phrases when you want to sound more certain."
        if confidence_hits
        else "Your wording sounds direct and confident.",
    ]
    return {
        "pacing_words_per_minute": wpm,
        "energy_delivery_score": "Balanced" if label == "good" else "Needs pacing practice",
        "hesitation_markers_detected": sorted(set(filler_hits + confidence_hits)),
        "pace_label": label,
        "filler_count": len(filler_hits),
        "filler_per_minute": filler_per_minute,
        "confidence_phrases": confidence_hits,
        "repeated_words": repeated,
        "long_sentences": long_sentences,
        "struggle_sentences": struggle_sentences,
        "feedback": suggestions,
    }


def coach_voice_memo(lesson_text: str, user_id: str, answer_id: str) -> Optional[str]:
    if not eleven_client:
        return None
    try:
        audio_generator = eleven_client.generate(
            text=lesson_text,
            model_id="eleven_flash_v2_5",
            voice_id=ELEVENLABS_VOICE_ID,
        )
        audio_bytes = b"".join(audio_generator)
        storage_path = f"coach_memos/{user_id}/{answer_id}_feedback.mp3"
        supabase_admin.storage.from_("speakready-media").upload(
            path=storage_path,
            file=audio_bytes,
            file_options={"content-type": "audio/mpeg", "x-upsert": "true"},
        )
        return supabase_admin.storage.from_("speakready-media").get_public_url(storage_path)
    except Exception:
        return None


def owned_session(session_id: str, user_id: str) -> dict[str, Any]:
    res = (
        supabase_admin.table("sessions")
        .select("*")
        .eq("id", session_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not res.data:
        raise HTTPException(status_code=404, detail="Session not found.")
    return res.data[0]


def question_text(question_id: str, session_id: str) -> str:
    res = (
        supabase_admin.table("questions")
        .select("*")
        .eq("id", question_id)
        .eq("session_id", session_id)
        .execute()
    )
    if not res.data:
        raise HTTPException(status_code=404, detail="Question not found.")
    return res.data[0]["question_text"]


@app.get("/health")
async def health():
    return {"ok": True}


@app.post("/api/sessions", status_code=201)
async def create_session(data: SessionCreate, user_id: str = Depends(get_current_user_id)):
    payload = {**data.model_dump(), "user_id": user_id}
    res = supabase_admin.table("sessions").insert(payload).execute()
    return res.data[0]


@app.get("/api/sessions")
async def get_sessions(user_id: str = Depends(get_current_user_id)):
    res = (
        supabase_admin.table("sessions")
        .select("*")
        .eq("user_id", user_id)
        .order("updated_at", desc=True)
        .execute()
    )
    return res.data


@app.get("/api/sessions/{session_id}")
async def get_session(session_id: UUID, user_id: str = Depends(get_current_user_id)):
    return owned_session(str(session_id), user_id)


@app.post("/api/questions", status_code=201)
async def create_question(data: QuestionCreate, user_id: str = Depends(get_current_user_id)):
    owned_session(str(data.session_id), user_id)
    payload = data.model_dump()
    payload["session_id"] = str(data.session_id)
    res = supabase_admin.table("questions").insert(payload).execute()
    return res.data[0]


@app.get("/api/sessions/{session_id}/questions")
async def get_session_questions(session_id: UUID, user_id: str = Depends(get_current_user_id)):
    owned_session(str(session_id), user_id)
    res = (
        supabase_admin.table("questions")
        .select("*")
        .eq("session_id", str(session_id))
        .order("created_at")
        .execute()
    )
    return res.data


@app.get("/api/questions/{question_id}/answers")
async def get_question_answers(question_id: UUID, user_id: str = Depends(get_current_user_id)):
    res = (
        supabase_admin.table("answers")
        .select("*")
        .eq("question_id", str(question_id))
        .eq("user_id", user_id)
        .order("created_at")
        .execute()
    )
    return res.data


@app.post("/api/answers/analyze-text", status_code=201)
async def analyze_text_answer(data: TextAnswerSubmit, user_id: str = Depends(get_current_user_id)):
    session = owned_session(str(data.session_id), user_id)
    question = question_text(str(data.question_id), str(data.session_id))
    script_analysis = analyze_script(
        role=session["role"],
        org=session["organisation"],
        question=question,
        text=data.original_text,
    )
    speech_analysis = speech_metrics(data.original_text)
    answer_payload = {
        "question_id": str(data.question_id),
        "session_id": str(data.session_id),
        "user_id": user_id,
        "original_text": data.original_text,
        "transcript": data.original_text,
        "native_language": data.native_language,
        "script_analysis": script_analysis,
        "speech_analysis": speech_analysis,
    }
    answer = supabase_admin.table("answers").insert(answer_payload).execute().data[0]
    coach_url = coach_voice_memo(
        script_analysis.get("coaching_lesson", ""), user_id, answer["id"]
    )
    if coach_url:
        supabase_admin.table("answers").update({"audio_url": coach_url}).eq(
            "id", answer["id"]
        ).execute()

    return {
        "answer_id": answer["id"],
        "transcript": data.original_text,
        "speech_analysis": speech_analysis,
        "script_analysis": script_analysis,
        "coach_audio_url": coach_url,
    }


@app.post("/api/answers/analyze-audio", status_code=201)
async def analyze_audio_answer(
    question_id: str = Form(...),
    session_id: str = Form(...),
    duration_seconds: float = Form(0.0),
    file: UploadFile = File(...),
    user_id: str = Depends(get_current_user_id),
):
    session = owned_session(session_id, user_id)
    question = question_text(question_id, session_id)
    audio_content = await file.read()
    ext = file.filename.split(".")[-1] if file.filename and "." in file.filename else "webm"
    storage_path = f"records/{user_id}/{session_id}_{question_id}.{ext}"
    media_url = None
    try:
        supabase_admin.storage.from_("speakready-media").upload(
            path=storage_path,
            file=audio_content,
            file_options={"content-type": file.content_type or "audio/webm", "x-upsert": "true"},
        )
        media_url = supabase_admin.storage.from_("speakready-media").get_public_url(storage_path)
    except Exception:
        media_url = None

    transcript = "[Audio received. Transcription is unavailable in demo mode.]"
    if gemini_client:
        try:
            response = gemini_client.models.generate_content(
                model="gemini-2.5-flash",
                contents=[
                    types.Part.from_bytes(
                        data=audio_content, mime_type=file.content_type or "audio/webm"
                    ),
                    "Transcribe this interview answer exactly. Return only transcript text.",
                ],
            )
            transcript = response.text.strip()
        except Exception:
            pass

    script_analysis = analyze_script(
        role=session["role"], org=session["organisation"], question=question, text=transcript
    )
    speech_analysis = speech_metrics(transcript, duration_seconds)
    answer_payload = {
        "question_id": question_id,
        "session_id": session_id,
        "user_id": user_id,
        "original_text": transcript,
        "transcript": transcript,
        "duration_seconds": duration_seconds,
        "video_url": media_url,
        "script_analysis": script_analysis,
        "speech_analysis": speech_analysis,
    }
    answer = supabase_admin.table("answers").insert(answer_payload).execute().data[0]
    coach_url = coach_voice_memo(
        script_analysis.get("coaching_lesson", ""), user_id, answer["id"]
    )

    return {
        "answer_id": answer["id"],
        "transcript": transcript,
        "speech_analysis": speech_analysis,
        "script_analysis": script_analysis,
        "coach_audio_url": coach_url,
    }
