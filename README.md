# SpeakReady

Submission for [Rebuild x ElevenLabs Hackathon](https://github.com/gsharsh/rebuild).

AI interview and presentation coach for multilingual and under-coached students.

SpeakReady helps users rehearse job interviews, visa interviews, and class presentations with transcript-grounded coaching, speech drills, emotion and tone feedback, and camera-presence guidance.

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Set up the backend

Create a Python virtual environment and install the FastAPI dependencies:

```bash
cd backend
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
cd ..
```

Install `ffmpeg` for browser audio/video conversion before Valence analysis:

```bash
brew install ffmpeg
```

### 3. Set up environment

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

**Required:**
- `NEXT_PUBLIC_API_URL` — FastAPI backend (default `http://localhost:8000`)
- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase Auth, tables, and storage
- `GEMINI_API_KEY` — script analysis, question generation, and practice-drill coaching
- `ELEVENLABS_API_KEY` — transcription and coach audio
- `VALENCE_API_KEY` — emotion and tone analysis

**Recommended:**
- `SUPABASE_SERVICE_ROLE_KEY` — backend service access for server-side inserts and storage writes
- `ELEVENLABS_VOICE_ID` — coach demo voice, defaults to `21m00Tcm4TlvDq8ikWAM`
- `FFMPEG_PATH` — explicit ffmpeg binary path, for example `/opt/homebrew/bin/ffmpeg`

### 4. Run the app

Start the FastAPI backend:

```bash
backend/.venv/bin/uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000
```

Then start the frontend:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

If port `8000` is already in use, stop the existing backend process or run the backend on another port and update `NEXT_PUBLIC_API_URL`.

## Architecture

- **Next.js App Router** — frontend UI
- **FastAPI backend** — sessions, questions, answers, transcription, and AI coaching (`NEXT_PUBLIC_API_URL`)
- **Supabase Auth** — login/signup with JWT passed to FastAPI
- **Supabase Postgres** — session, question, and answer records
- **Supabase Storage** — media uploads to the `speakready-media` bucket
- **Gemini** — purpose-aware question generation, script coaching, and section practice feedback
- **ElevenLabs** — multilingual transcription, translation support, and coach demo audio
- **Valence** — emotion and tone signals from converted WAV audio
- **MediaPipe Tasks Vision** — local browser posture and camera-presence analysis

## Demo Mode

Use **Load demo answer** in a session workspace, or practise when the API is unavailable — the app falls back to sample coaching from `demo-data.ts`.

## Current Features

- Purpose-specific setup for job interviews, visa interviews, and class presentations
- Session dashboard with rename/delete/share-style actions
- Sticky interview question or presentation-section sidebar
- Audio recording with ElevenLabs transcription and Gemini coaching
- Optional camera recording for posture, eye-line, head stability, and face-framing feedback
- Valence-powered emotion and tone summary
- Pace graph, filler detection, script improvement, and delivery drills
- Section-level practice loop with original playback, coach demo playback, and retry feedback
- Text input with automatic language detection and English coaching

## Pages

| Route | Description |
|-------|-------------|
| `/` | Landing page |
| `/login` | Sign up / sign in |
| `/dashboard` | Session list and session management |
| `/sessions/new` | Purpose-aware session wizard |
| `/sessions/[id]` | Practice workspace with speech, script, emotion, and posture feedback |

## Supabase Tables

The backend expects these tables:

- `public.sessions`
- `public.questions`
- `public.answers`

The app also expects a public storage bucket named `speakready-media`. Enable row-level security so users can only manage their own sessions, questions, answers, and media.

## Product Language

SpeakReady uses supportive coaching language: clearer delivery, confidence coaching, listener-friendly phrasing, interview readiness, posture signals, and camera attention.
