import json
import os
import re
import shutil
import subprocess
import time
from datetime import datetime, timezone
from tempfile import NamedTemporaryFile
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

try:
    from valenceai import ValenceClient
except Exception:  # pragma: no cover - optional in demo mode
    ValenceClient = None

try:
    from valenceai.exceptions import (
        AudioTooShortError,
        FileSizeLimitExceededError,
        PredictionError,
        UploadError,
        ValenceSDKException,
    )
    VALENCE_EXCEPTIONS = (
        AudioTooShortError,
        FileSizeLimitExceededError,
        PredictionError,
        UploadError,
        ValenceSDKException,
    )
except Exception:  # pragma: no cover - package version guard
    VALENCE_EXCEPTIONS = (Exception,)

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
VALENCE_API_KEY = os.environ.get("VALENCE_API_KEY")
VALENCE_API_BASE_URL = os.environ.get("VALENCE_API_BASE_URL")
VALENCE_WEBSOCKET_URL = os.environ.get("VALENCE_WEBSOCKET_URL")
FFMPEG_PATH = os.environ.get("FFMPEG_PATH") or shutil.which("ffmpeg")

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
valence_client = (
    ValenceClient(
        api_key=VALENCE_API_KEY,
        base_url=VALENCE_API_BASE_URL or None,
        websocket_url=VALENCE_WEBSOCKET_URL or None,
        comprehensive_output=True,
    )
    if ValenceClient and VALENCE_API_KEY
    else None
)

app = FastAPI(title="SpeakReady Engine", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r".*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class SessionCreate(BaseModel):
    interview_type: str
    role: str
    organisation: str
    context: Optional[str] = None


class SessionUpdate(BaseModel):
    role: Optional[str] = None
    organisation: Optional[str] = None
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
VALID_CARTESIA_EMOTIONS = {
    "neutral",
    "calm",
    "content",
    "friendly",
    "professional",
    "empathetic",
    "warm",
    "reassuring",
    "excited",
    "happy",
    "apologetic",
    "patient",
    "concerned",
}


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


def clean_delivery_sentence(sentence: str) -> str:
    cleaned = f" {sentence.strip()} "
    replacements = [
        (r"\b(um|uh|like|you know|basically|actually|literally|i mean)\b,?\s*", ""),
        (r"\b(kind of|sort of|maybe|hopefully)\b\s*", ""),
        (r"\bI think\b\s*", ""),
        (r"\s+", " "),
    ]
    for pattern, replacement in replacements:
        cleaned = re.sub(pattern, replacement, cleaned, flags=re.IGNORECASE)
    cleaned = cleaned.strip(" ,")
    return cleaned[:1].upper() + cleaned[1:] if cleaned else sentence


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


def build_practice_targets(
    transcript: str,
    metrics: dict[str, Any],
    normalized: Optional[dict[str, Any]] = None,
) -> list[dict[str, str]]:
    targets: list[dict[str, str]] = []
    for item in metrics.get("struggle_sentences", [])[:3]:
        if not isinstance(item, dict):
            continue
        sentence = str(item.get("sentence") or "").strip()
        if not sentence:
            continue
        targets.append(
            {
                "type": "sentence",
                "focus": str(item.get("reason") or "Make this line easier to deliver."),
                "original": sentence,
                "demo": clean_delivery_sentence(sentence),
                "practice_cue": "Practice this one line until it sounds smooth without filler words.",
            }
        )

    pace = metrics.get("pace_label")
    if pace in {"too_fast", "slightly_fast"}:
        targets.append(
            {
                "type": "delivery",
                "focus": "Pace is too quick for listeners to absorb the main point.",
                "original": transcript[:180],
                "demo": "Say the same idea with a half-second pause after each key phrase.",
                "practice_cue": "Repeat the opening with slower pacing and deliberate pauses.",
            }
        )
    elif pace == "too_slow":
        targets.append(
            {
                "type": "delivery",
                "focus": "Pace is slow enough that the delivery may lose energy.",
                "original": transcript[:180],
                "demo": "Keep the same words, but connect phrases more tightly and lift the ending.",
                "practice_cue": "Repeat the section with a little more forward motion.",
            }
        )

    tags = normalized.get("normalizedTags", []) if normalized else []
    if any(tag in tags for tag in ["flat", "monotone"]):
        targets.append(
            {
                "type": "tone",
                "focus": "Tone sounds flat, so important ideas may not stand out.",
                "original": transcript[:180],
                "demo": "Emphasize the most important noun or verb in each sentence.",
                "practice_cue": "Repeat the strongest sentence with one word clearly emphasized.",
            }
        )

    return targets[:4]


def extract_scores_from_valence(raw: Any) -> dict[str, float]:
    scores: dict[str, float] = {}
    possible = raw
    if isinstance(raw, dict):
        timeline = raw.get("emotions")
        if isinstance(timeline, list):
            totals: dict[str, float] = {}
            counts: dict[str, int] = {}
            for item in timeline:
                if not isinstance(item, dict):
                    continue
                predictions = item.get("all_predictions")
                if isinstance(predictions, dict):
                    for label, value in predictions.items():
                        if isinstance(value, (int, float)):
                            totals[label.lower()] = totals.get(label.lower(), 0) + float(value)
                            counts[label.lower()] = counts.get(label.lower(), 0) + 1
                    continue
                label = str(item.get("emotion") or "").lower()
                confidence = item.get("confidence")
                if label and isinstance(confidence, (int, float)):
                    totals[label] = totals.get(label, 0) + float(confidence)
                    counts[label] = counts.get(label, 0) + 1
            return {
                label: round(total / max(counts[label], 1), 4)
                for label, total in totals.items()
            }
        possible = (
            raw.get("confidences")
            or raw.get("scores")
            or raw.get("emotions")
            or raw.get("predictions")
            or raw
        )

    if isinstance(possible, list):
        for item in possible:
            if not isinstance(item, dict):
                continue
            label = str(
                item.get("label") or item.get("emotion") or item.get("name") or ""
            ).lower()
            score = item.get("score", item.get("confidence", item.get("value")))
            if label:
                try:
                    scores[label] = float(score)
                except (TypeError, ValueError):
                    pass
    elif isinstance(possible, dict):
        for key, value in possible.items():
            if isinstance(value, (int, float)):
                scores[key.lower()] = float(value)
            elif isinstance(value, dict):
                score = value.get("score", value.get("confidence", value.get("value")))
                try:
                    scores[key.lower()] = float(score)
                except (TypeError, ValueError):
                    pass
    return scores


def normalize_valence(raw: Any, transcript: str, base_metrics: dict[str, Any]) -> dict[str, Any]:
    scores = extract_scores_from_valence(raw)
    tags: set[str] = set()
    prediction = ""
    if isinstance(raw, dict):
        prediction = str(
            raw.get("main_emotion")
            or raw.get("prediction")
            or raw.get("emotion")
            or raw.get("label")
            or ""
        ).lower()
        if not prediction and isinstance(raw.get("emotions"), list):
            emotion_counts: dict[str, float] = {}
            for item in raw["emotions"]:
                if not isinstance(item, dict):
                    continue
                label = str(item.get("emotion") or "").lower()
                confidence = item.get("confidence", 1)
                if label:
                    try:
                        emotion_counts[label] = emotion_counts.get(label, 0) + float(confidence)
                    except (TypeError, ValueError):
                        emotion_counts[label] = emotion_counts.get(label, 0) + 1
            if emotion_counts:
                prediction = max(emotion_counts, key=emotion_counts.get)

    if any(word in prediction for word in ["nervous", "fear", "anxious"]):
        tags.add("nervous")
    if "confident" in prediction:
        tags.add("confident")
    if "calm" in prediction:
        tags.add("calm")
    if "excited" in prediction or "happy" in prediction:
        tags.add("excited")
        tags.add("energetic")
    if "frustrated" in prediction or "angry" in prediction:
        tags.add("frustrated")
    if "sad" in prediction or "disappointed" in prediction:
        tags.add("disappointed")
        tags.add("flat")
    if "neutral" in prediction:
        tags.add("neutral")
        tags.add("calm")

    if scores.get("happy", 0) >= 0.5:
        tags.update(["excited", "energetic"])
    if scores.get("neutral", 0) >= 0.5:
        tags.update(["neutral", "calm"])
    if scores.get("sad", 0) >= 0.45:
        tags.update(["flat", "disappointed"])
    if scores.get("angry", 0) >= 0.45:
        tags.add("frustrated")
    if scores.get("confidence", 0) >= 0.7:
        tags.add("confident")
    if scores.get("confidence", 1) < 0.45:
        tags.add("low_confidence")
    if max(scores.get("nervousness", 0), scores.get("nervous", 0), scores.get("anxiety", 0)) >= 0.6:
        tags.add("nervous")
    if scores.get("anxiety", scores.get("anxious", 0)) >= 0.6:
        tags.add("anxious")
    if scores.get("hesitation", scores.get("hesitant", 0)) >= 0.55:
        tags.add("hesitant")
    if scores.get("uncertainty", scores.get("uncertain", 0)) >= 0.55:
        tags.add("uncertain")
    if scores.get("energy", scores.get("arousal", 0)) >= 0.7:
        tags.add("energetic")
    if scores.get("energy", scores.get("arousal", 1)) < 0.35:
        tags.add("flat")
    if scores.get("expressiveness", 1) < 0.4:
        tags.add("monotone")
    if scores.get("clarity", 0) >= 0.75:
        tags.add("clear")
    if scores.get("clarity", 1) < 0.5:
        tags.add("unclear")

    if base_metrics.get("filler_count", 0) >= 3:
        tags.add("hesitant")
    if base_metrics.get("pace_label") == "too_fast":
        tags.add("rushed")
    if base_metrics.get("pace_label") == "too_slow":
        tags.add("slow")
    if not tags:
        tags.add("neutral")

    priority = [
        "nervous",
        "anxious",
        "low_confidence",
        "rushed",
        "unclear",
        "hesitant",
        "monotone",
        "flat",
        "quiet",
        "confused",
        "uncertain",
        "frustrated",
        "disappointed",
        "confident",
        "clear",
        "expressive",
        "energetic",
        "neutral",
    ]
    ordered = [tag for tag in priority if tag in tags]
    primary = "overall delivery"
    if any(tag in ordered for tag in ["nervous", "anxious", "low_confidence"]):
        primary = "confidence"
    elif any(tag in ordered for tag in ["rushed", "slow"]):
        primary = "pace"
    elif any(tag in ordered for tag in ["unclear", "hesitant", "uncertain"]):
        primary = "clarity"
    elif any(tag in ordered for tag in ["monotone", "flat", "quiet"]):
        primary = "vocal expression"
    elif any(tag in ordered for tag in ["confident", "clear", "expressive", "energetic"]):
        primary = "polish"

    return {"normalizedTags": ordered, "primaryFocus": primary, "scores": scores}


def get_coach_tones(tags: list[str]) -> list[str]:
    has = lambda items: any(item in tags for item in items)
    if has(["nervous", "anxious"]):
        return ["reassuring", "calm", "warm"]
    if has(["low_confidence", "quiet"]):
        return ["warm", "reassuring", "friendly"]
    if has(["hesitant", "uncertain"]):
        return ["patient", "friendly", "reassuring"]
    if has(["confused", "unclear"]):
        return ["patient", "calm", "friendly"]
    if has(["frustrated", "disappointed"]):
        return ["empathetic", "calm", "professional"]
    if has(["rushed"]):
        return ["calm", "professional", "reassuring"]
    if has(["flat", "monotone", "disengaged"]):
        return ["friendly", "warm", "content"]
    if has(["excited", "energetic"]):
        return ["friendly", "content", "professional"]
    if has(["confident", "clear", "expressive"]):
        return ["content", "friendly", "professional"]
    return ["friendly", "professional", "warm"]


def next_action(primary_focus: str) -> str:
    if primary_focus == "confidence":
        return "Repeat the same line with slightly stronger volume and a firmer ending."
    if primary_focus == "pace":
        return "Pause briefly after each main idea before continuing."
    if primary_focus == "clarity":
        return "Reduce filler words and use one clean pause instead."
    if primary_focus == "vocal expression":
        return "Emphasize the most important words instead of keeping the same tone throughout."
    if primary_focus == "polish":
        return "Keep the confidence and make transitions smoother."
    return "Repeat the attempt with one clear improvement focus."


def build_emotional_coach(transcript: str, normalized: dict[str, Any]) -> dict[str, str]:
    tags = normalized.get("normalizedTags", ["neutral"])
    tones = get_coach_tones(tags)
    focus = normalized.get("primaryFocus", "overall delivery")
    first = tones[0] if tones else "friendly"
    second = tones[1] if len(tones) > 1 else "professional"
    third = tones[2] if len(tones) > 2 else "warm"
    action = next_action(focus)
    if focus == "confidence":
        observation = "Your content comes through, but the delivery can land with more certainty."
    elif focus == "pace":
        observation = "Your pace is making some ideas harder to absorb."
    elif focus == "clarity":
        observation = "The idea is there, but fillers or pauses make it feel less clear."
    elif focus == "vocal expression":
        observation = "The structure is understandable, and the next step is adding more vocal variety."
    elif focus == "polish":
        observation = "That sounded clear and controlled."
    else:
        observation = "This is a useful practice attempt with a clear next step."
    text = f"{observation} Focus on {focus} in the next round. {action}"
    ssml = (
        f'<emotion value="{first}"/> {observation} '
        f'<emotion value="{second}"/> Focus on {focus} in the next round. '
        f'<emotion value="{third}"/> {action}'
    )
    return {
        "ssml": ssml,
        "text": text,
        "summary": f"Main focus: {focus}",
        "nextAction": action,
    }


def coach_memo_text(
    lesson_text: str,
    emotional_coach: Optional[dict[str, str]] = None,
    practice_targets: Optional[list[dict[str, str]]] = None,
) -> str:
    parts = []
    if emotional_coach:
        summary = emotional_coach.get("summary")
        coach_text = emotional_coach.get("text")
        next_action_text = emotional_coach.get("nextAction")
        if summary:
            parts.append(summary)
        if coach_text:
            parts.append(coach_text)
        if next_action_text:
            parts.append(next_action_text)
    if practice_targets:
        target = practice_targets[0]
        original = target.get("original")
        demo = target.get("demo")
        cue = target.get("practice_cue")
        if original:
            parts.append(f"Practice this section: {original}")
        if demo and demo != original:
            parts.append(f"Try it like this: {demo}")
        if cue:
            parts.append(cue)
    if lesson_text:
        parts.append(lesson_text)
    return " ".join(parts)[:1800]


def convert_audio_to_wav(
    audio_content: bytes,
    source_suffix: str,
) -> tuple[Optional[str], Optional[str]]:
    if not FFMPEG_PATH:
        return None, "ffmpeg is not installed or FFMPEG_PATH is not configured."

    source_suffix = source_suffix if source_suffix.startswith(".") else f".{source_suffix}"
    input_path = ""
    output_path = ""
    try:
        with NamedTemporaryFile(suffix=source_suffix, delete=False) as source_file:
            source_file.write(audio_content)
            input_path = source_file.name
        with NamedTemporaryFile(suffix=".wav", delete=False) as wav_file:
            output_path = wav_file.name

        subprocess.run(
            [
                FFMPEG_PATH,
                "-y",
                "-i",
                input_path,
                "-ac",
                "1",
                "-ar",
                "44100",
                "-f",
                "wav",
                output_path,
            ],
            check=True,
            capture_output=True,
            timeout=30,
        )
        return output_path, None
    except (subprocess.SubprocessError, OSError) as exc:
        if output_path:
            try:
                os.unlink(output_path)
            except OSError:
                pass
        return None, str(exc)
    finally:
        if input_path:
            try:
                os.unlink(input_path)
            except OSError:
                pass


def call_valence(
    audio_content: bytes,
    content_type: str,
    duration_seconds: float,
    filename: Optional[str],
) -> tuple[dict[str, Any], bool]:
    if not valence_client:
        return {"prediction": "neutral", "source": "fallback_no_valence_client"}, True

    extension = ""
    if filename and "." in filename:
        extension = filename.rsplit(".", 1)[-1].lower()
    is_wav = extension == "wav" or content_type.lower() in {"audio/wav", "audio/x-wav", "audio/wave"}

    if 0 < duration_seconds < 4.5:
        return {
            "prediction": "neutral",
            "source": "fallback_audio_too_short_for_valence",
            "error": "Valence short-clip analysis needs at least 4.5 seconds of audio.",
        }, True

    tmp_path = ""
    converted_path = ""
    try:
        if is_wav:
            with NamedTemporaryFile(suffix=".wav", delete=False) as temp_audio:
                temp_audio.write(audio_content)
                tmp_path = temp_audio.name
        else:
            source_suffix = extension or "webm"
            converted_path, conversion_error = convert_audio_to_wav(
                audio_content,
                source_suffix,
            )
            if not converted_path:
                return {
                    "prediction": "neutral",
                    "source": "fallback_wav_conversion_failed",
                    "error": conversion_error or "Could not convert audio to WAV for Valence.",
                }, True
            tmp_path = converted_path

        if duration_seconds and duration_seconds <= 15:
            result = valence_client.discrete.emotions(file_path=tmp_path)
            return result if isinstance(result, dict) else {"result": result}, False

        request_id = valence_client.asynch.upload(tmp_path)
        result = valence_client.asynch.emotions(
            request_id,
            max_attempts=30,
            interval_seconds=10,
        )
        return result if isinstance(result, dict) else {"result": result}, False
    except VALENCE_EXCEPTIONS as exc:
        return {"prediction": "neutral", "error": str(exc)}, True
    except Exception as exc:
        return {"prediction": "neutral", "error": str(exc)}, True
    finally:
        if tmp_path:
            try:
                os.unlink(tmp_path)
            except OSError:
                pass


def coach_voice_memo(lesson_text: str, user_id: str, answer_id: str) -> tuple[Optional[str], Optional[str]]:
    if not eleven_client:
        return None, "Missing ELEVENLABS_API_KEY or ElevenLabs SDK."
    try:
        audio_generator = eleven_client.generate(
            text=lesson_text,
            model="eleven_flash_v2_5",
            voice=ELEVENLABS_VOICE_ID,
            output_format="mp3_44100_128",
        )
        audio_bytes = b"".join(audio_generator)
        if not audio_bytes:
            return None, "ElevenLabs returned empty audio."
        storage_path = f"coach_memos/{user_id}/{answer_id}_feedback.mp3"
        supabase_admin.storage.from_("speakready-media").upload(
            path=storage_path,
            file=audio_bytes,
            file_options={"content-type": "audio/mpeg", "x-upsert": "true"},
        )
        return supabase_admin.storage.from_("speakready-media").get_public_url(storage_path), None
    except Exception as exc:
        return None, str(exc)


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


@app.patch("/api/sessions/{session_id}")
async def update_session(
    session_id: UUID,
    data: SessionUpdate,
    user_id: str = Depends(get_current_user_id),
):
    owned_session(str(session_id), user_id)
    payload = {
        key: value
        for key, value in data.model_dump().items()
        if value is not None
    }
    if not payload:
        raise HTTPException(status_code=400, detail="No session fields provided.")
    payload["updated_at"] = datetime.now(timezone.utc).isoformat()
    res = (
        supabase_admin.table("sessions")
        .update(payload)
        .eq("id", str(session_id))
        .eq("user_id", user_id)
        .execute()
    )
    return res.data[0]


@app.delete("/api/sessions/{session_id}", status_code=204)
async def delete_session(session_id: UUID, user_id: str = Depends(get_current_user_id)):
    owned_session(str(session_id), user_id)
    supabase_admin.table("sessions").delete().eq("id", str(session_id)).eq(
        "user_id", user_id
    ).execute()
    return None


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
    normalized = normalize_valence(
        {"prediction": "neutral", "source": "text_only"},
        data.original_text,
        speech_analysis,
    )
    emotional_coach = build_emotional_coach(data.original_text, normalized)
    practice_targets = build_practice_targets(data.original_text, speech_analysis, normalized)
    speech_analysis["valence"] = {
        "raw": {"prediction": "neutral", "source": "text_only"},
        "valenceFailed": True,
        **normalized,
    }
    speech_analysis["emotional_coach_ssml"] = emotional_coach["ssml"]
    speech_analysis["emotional_coach_text"] = emotional_coach["text"]
    speech_analysis["emotional_next_action"] = emotional_coach["nextAction"]
    speech_analysis["practice_targets"] = practice_targets
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
    coach_url, coach_error = coach_voice_memo(
        coach_memo_text(
            script_analysis.get("coaching_lesson", ""),
            emotional_coach,
            practice_targets,
        ),
        user_id,
        answer["id"],
    )
    if coach_error:
        speech_analysis["coach_audio_error"] = coach_error
        supabase_admin.table("answers").update({"speech_analysis": speech_analysis}).eq(
            "id", answer["id"]
        ).execute()
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
        "coach_audio_error": coach_error,
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
    raw_valence, valence_failed = call_valence(
        audio_content,
        file.content_type or "audio/webm",
        duration_seconds,
        file.filename,
    )
    normalized = normalize_valence(raw_valence, transcript, speech_analysis)
    emotional_coach = build_emotional_coach(transcript, normalized)
    practice_targets = build_practice_targets(transcript, speech_analysis, normalized)
    speech_analysis["valence"] = {
        "raw": raw_valence,
        "valenceFailed": valence_failed,
        **normalized,
    }
    speech_analysis["emotional_coach_ssml"] = emotional_coach["ssml"]
    speech_analysis["emotional_coach_text"] = emotional_coach["text"]
    speech_analysis["emotional_next_action"] = emotional_coach["nextAction"]
    speech_analysis["practice_targets"] = practice_targets
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
    coach_url, coach_error = coach_voice_memo(
        coach_memo_text(
            script_analysis.get("coaching_lesson", ""),
            emotional_coach,
            practice_targets,
        ),
        user_id,
        answer["id"],
    )
    if coach_error:
        speech_analysis["coach_audio_error"] = coach_error
        supabase_admin.table("answers").update({"speech_analysis": speech_analysis}).eq(
            "id", answer["id"]
        ).execute()
    if coach_url:
        supabase_admin.table("answers").update({"audio_url": coach_url}).eq(
            "id", answer["id"]
        ).execute()

    return {
        "answer_id": answer["id"],
        "transcript": transcript,
        "speech_analysis": speech_analysis,
        "script_analysis": script_analysis,
        "coach_audio_url": coach_url,
        "coach_audio_error": coach_error,
    }
