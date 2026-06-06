# SpeakReady

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

**Minimum to run the demo (typed answers with mock AI):**
- `DATABASE_URL` — local PostgreSQL connection string
- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase Auth

**Optional (real AI features):**
- `GEMINI_API_KEY` — script coach, question generation, final feedback
- `ELEVENLABS_API_KEY` — speech-to-text, translation, text-to-speech
- `SUPABASE_SERVICE_ROLE_KEY` — only needed for admin operations

### 3. Set up database

```bash
npx prisma migrate dev --name init
```

### 4. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Architecture

- **Next.js App Router** — frontend + API route handlers (no separate backend)
- **Supabase Auth** — login/signup/session only
- **Local PostgreSQL + Prisma** — all app data
- **Local file storage** — `uploads/` directory for audio/video
- **Gemini API** — AI coaching (server-side only, with mock fallbacks)
- **ElevenLabs API** — STT/translation/TTS (server-side only, with mock fallbacks)

## Demo Mode

Without API keys, the app works fully with typed answers using supportive mock coaching feedback. Audio/video gracefully fall back with helpful error messages.

## Pages

| Route | Description |
|-------|-------------|
| `/` | Landing page |
| `/login` | Sign up / sign in |
| `/dashboard` | Session list |
| `/sessions/new` | Create session |
| `/sessions/[id]` | Session workspace |

## Product Language

SpeakReady uses supportive coaching language: clearer delivery, confidence coaching, listener-friendly phrasing, interview readiness, posture signals, and camera attention.
