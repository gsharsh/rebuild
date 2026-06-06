# SpeakReady

Submission for [Rebuild x ElevenLabs Hackathon](https://github.com/gsharsh/rebuild)

AI interview and presentation coach for multilingual and under-coached students.

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Set up environment

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

**Required:**
- `NEXT_PUBLIC_API_URL` — FastAPI backend (default `http://localhost:8000`)
- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase Auth & Storage

### 3. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Architecture

- **Next.js App Router** — frontend UI
- **FastAPI backend** — sessions, questions, answers, AI coaching (`NEXT_PUBLIC_API_URL`)
- **Supabase Auth** — login/signup with JWT passed to FastAPI
- **Supabase Storage** — resume uploads to `speakready-media` bucket

## Demo Mode

Use **Load demo answer** in a session workspace, or practise when the API is unavailable — the app falls back to sample coaching from `demo-data.ts`.

## Pages

| Route | Description |
|-------|-------------|
| `/` | Landing page |
| `/login` | Sign up / sign in |
| `/dashboard` | Session list (NTU-style grid) |
| `/sessions/new` | 3-step session wizard |
| `/sessions/[id]` | Session workspace |

## Product Language

SpeakReady uses supportive coaching language: clearer delivery, confidence coaching, listener-friendly phrasing, interview readiness, posture signals, and camera attention.
