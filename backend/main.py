import json
import os
import time
from typing import Any, Optional
from uuid import UUID

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, File, Form, Header, HTTPException, Response, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from google import genai
from google.genai import types
from google.genai.errors import ClientError, ServerError
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


def _word_cap(text: str, max_words: int) -> str:
    words = str(text).split()
    if len(words) <= max_words:
        return str(text).strip()
    return " ".join(words[:max_words]).strip() + "…"


def trim_coaching_output(parsed: dict[str, Any]) -> dict[str, Any]:
    if parsed.get("coaching_lesson"):
        parsed["coaching_lesson"] = _word_cap(parsed["coaching_lesson"], 20)
    if parsed.get("improved_script"):
        parsed["improved_script"] = _word_cap(parsed["improved_script"], 90)
    trimmed_changes = []
    for change in (parsed.get("changes_made") or [])[:3]:
        if not isinstance(change, dict):
            continue
        trimmed_changes.append(
            {
                "original": _word_cap(change.get("original", ""), 12),
                "fixed": _word_cap(change.get("fixed", ""), 12),
                "reason": _word_cap(change.get("reason", ""), 12),
            }
        )
    parsed["changes_made"] = trimmed_changes
    words = parsed.get("words_to_practice") or []
    if isinstance(words, list):
        parsed["words_to_practice"] = [str(w) for w in words[:2]]
    return parsed


def fallback_script(text: str, reason: str = "AI coaching is temporarily unavailable.") -> dict[str, Any]:
    return {
        "improved_script": text,
        "changes_made": [
            {
                "original": text[:120],
                "fixed": text[:120],
                "reason": reason,
            }
        ],
        "coaching_lesson": "Open with a direct answer, use shorter sentences, and connect your example back to the opportunity.",
        "words_to_practice": [],
        "coaching_fallback": True,
    }


def generate_script_analysis(model: str, user_prompt: str, config: types.GenerateContentConfig) -> dict[str, Any]:
    response = gemini_client.models.generate_content(
        model=model,
        contents=user_prompt,
        config=config,
    )
    if response and response.text:
        parsed = trim_coaching_output(safe_json(response.text))
        parsed["coaching_fallback"] = False
        return parsed
    raise ValueError("Empty model response")


def analyze_script(
    role: str,
    organization: str,
    context_notes: str,
    question: str,
    user_response: str,
    interview_type: str = "",
) -> dict[str, Any]:
    if not gemini_client:
        return fallback_script(user_response)

    user_prompt = f"""
CONTEXT PROFILE:
- Interview Type: {interview_type or "Interview"}
- Target Role: {role}
- Target Organization: {organization}
- Additional Background Context: {context_notes or "No additional context provided."}

INTERVIEW DATA:
- Question Asked: {question}
- Student's Raw Input/Draft: {user_response}

Analyze this response. Keep all output concise and scannable — short enough to read in under 30 seconds.
"""

    system_instruction = """
You are the elite AI Script Coach for 'SpeakReady', an interview rehearsal platform built for multilingual, first-generation, and immigrant students.

CRITICAL PROCESSING RULES:
1. PRESERVE THE INITIAL CAPABILITY: Do not convert the speech into an impersonal corporate template. Retain personal anecdotes, technical specificity, and original character traits.
2. OPTIMIZE FOR ORAL COMPREHENSION: Use short sentences. Cut filler and hedging. The improved script should sound natural when spoken aloud in under 60 seconds.
3. BE BRIEF: Students read this on a phone. No long paragraphs. No repeating the same advice in multiple fields.
4. TARGET PRACTICE ARRAYS: Pick at most 2 technical or multi-syllabic terms worth practising.

Never frame feedback as accent fixing, bad English, or poor English. Use supportive language about clearer delivery, confidence coaching, and interview readiness.

LENGTH LIMITS (strict):
- improved_script: 3–5 short sentences, max ~90 words total.
- changes_made: 2–3 items only. Each "original" and "fixed" snippet max 12 words. Each "reason" max 12 words.
- coaching_lesson: exactly 1 sentence, max 20 words.
- words_to_practice: 1–2 words only.

You MUST respond strictly in the following JSON schema representation without markdown tags or wrapped text:
{
  "improved_script": "Concise polished text for spoken delivery.",
  "changes_made": [
    {
      "original": "Short excerpt from input.",
      "fixed": "Short replacement.",
      "reason": "Brief why, max 12 words."
    }
  ],
  "coaching_lesson": "One short sentence.",
  "words_to_practice": ["word1"]
}
"""

    config = types.GenerateContentConfig(
        system_instruction=system_instruction,
        response_mime_type="application/json",
        temperature=0.3,
    )

    models = ("gemini-2.5-flash-lite", "gemini-2.0-flash", "gemini-2.5-flash")
    retry_delay = 2
    last_error = "AI coaching is temporarily unavailable."

    for model in models:
        for attempt in range(3):
            try:
                return generate_script_analysis(model, user_prompt, config)
            except ServerError:
                if attempt < 2:
                    time.sleep(retry_delay)
                    retry_delay *= 2
            except ClientError as exc:
                last_error = str(exc)
                if exc.status_code == 429 and attempt < 2:
                    time.sleep(35)
                    continue
                break
            except Exception as exc:
                last_error = str(exc)
                break

    if "429" in last_error or "quota" in last_error.lower():
        reason = "Gemini quota reached — coaching resets when your daily limit refreshes."
    elif not gemini_client:
        reason = "GEMINI_API_KEY is not configured on the backend."
    else:
        reason = "AI coaching failed — try again in a moment."

    return fallback_script(user_response, reason=reason)


def script_context_from_session(session: dict[str, Any]) -> dict[str, str]:
    """Map Supabase session row to Gemini context profile fields."""
    return {
        "role": session.get("role", ""),
        "organization": session.get("organisation", ""),
        "context_notes": session.get("context") or "",
        "interview_type": session.get("interview_type", ""),
    }


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


@app.delete("/api/sessions/{session_id}", status_code=204)
async def delete_session(
    session_id: UUID,
    user_id: str = Depends(get_current_user_id),
):
    owned_session(str(session_id), user_id)
    sid = str(session_id)
    try:
        questions = (
            supabase_admin.table("questions").select("id").eq("session_id", sid).execute()
        )
        for row in questions.data or []:
            supabase_admin.table("answers").delete().eq("question_id", row["id"]).execute()
        supabase_admin.table("answers").delete().eq("session_id", sid).execute()
        supabase_admin.table("questions").delete().eq("session_id", sid).execute()
        supabase_admin.table("sessions").delete().eq("id", sid).execute()
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Could not delete session: {exc}",
        ) from exc
    return Response(status_code=204)


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


@app.delete("/api/questions/{question_id}", status_code=204)
async def delete_question(question_id: UUID, user_id: str = Depends(get_current_user_id)):
    res = (
        supabase_admin.table("questions")
        .select("*")
        .eq("id", str(question_id))
        .execute()
    )
    if not res.data:
        raise HTTPException(status_code=404, detail="Question not found.")
    owned_session(res.data[0]["session_id"], user_id)
    supabase_admin.table("answers").delete().eq("question_id", str(question_id)).execute()
    supabase_admin.table("questions").delete().eq("id", str(question_id)).execute()


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
    ctx = script_context_from_session(session)
    script_analysis = analyze_script(
        role=ctx["role"],
        organization=ctx["organization"],
        context_notes=ctx["context_notes"],
        question=question,
        user_response=data.original_text,
        interview_type=ctx["interview_type"],
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

    ctx = script_context_from_session(session)
    script_analysis = analyze_script(
        role=ctx["role"],
        organization=ctx["organization"],
        context_notes=ctx["context_notes"],
        question=question,
        user_response=transcript,
        interview_type=ctx["interview_type"],
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
