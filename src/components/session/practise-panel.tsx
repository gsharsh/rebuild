"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { OutputCard } from "@/components/ui/output-card";
import { PostureAnalyzer, type PostureResult } from "@/components/session/posture-analyzer";
import { analyzeAudio, analyzeText } from "@/lib/api-client";
import { transcribeAudioFile } from "@/lib/elevenlabs-client";
import { DEMO_ANSWER, DEMO_ANALYZE_RESPONSE } from "@/lib/demo-data";
import type { AnalyzeResponse, AnswerMode } from "@/lib/api-types";
import { Mic, Square, Upload, Video, FlaskConical } from "lucide-react";

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

interface PractisePanelProps {
  sessionId: string;
  questionId: string;
  questionText: string;
  onAnalyzeStart: () => void;
  onAnalyzeComplete: (result: AnalyzeResponse, isDemo?: boolean) => void;
}

export function PractisePanel({
  sessionId,
  questionId,
  questionText,
  onAnalyzeStart,
  onAnalyzeComplete,
}: PractisePanelProps) {
  const [mode, setMode] = useState<AnswerMode>("audio");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [error, setError] = useState("");
  const [postureData, setPostureData] = useState<PostureResult | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);
  const videoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!recording) {
      setElapsedSec(0);
      return;
    }
    const tick = setInterval(() => {
      setElapsedSec(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 250);
    return () => clearInterval(tick);
  }, [recording]);

  const modes: { id: AnswerMode; label: string }[] = [
    { id: "audio", label: "Speak" },
    { id: "text", label: "Text" },
    { id: "video", label: "Video" },
  ];

  async function runAnalyze(
    fn: () => Promise<AnalyzeResponse>,
    fallback?: AnalyzeResponse
  ) {
    setLoading(true);
    onAnalyzeStart();
    setError("");
    try {
      const result = await fn();
      onAnalyzeComplete(result);
      setText("");
    } catch {
      if (fallback) {
        onAnalyzeComplete(fallback, true);
        setText("");
        setError("API unavailable — showing demo coaching feedback.");
      } else {
        setError("Could not analyze your answer. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  function loadDemo() {
    setText(DEMO_ANSWER);
    onAnalyzeStart();
    setTimeout(() => {
      onAnalyzeComplete(DEMO_ANALYZE_RESPONSE, true);
      setLoading(false);
    }, 400);
    setLoading(true);
  }

  async function submitText() {
    if (!text.trim()) return;
    await runAnalyze(
      () =>
        analyzeText({
          question_id: questionId,
          session_id: sessionId,
          original_text: text.trim(),
        }),
      DEMO_ANALYZE_RESPONSE
    );
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        stream.getTracks().forEach((t) => t.stop());
        setLoading(true);
        onAnalyzeStart();
        setError("");
        try {
          const stt = await transcribeAudioFile(blob);
          const transcript = stt.transcript?.trim();
          if (!transcript || stt.error) {
            throw new Error(stt.message ?? "Transcription failed");
          }
          const result = await analyzeText({
            question_id: questionId,
            session_id: sessionId,
            original_text: transcript,
          });
          onAnalyzeComplete(result);
        } catch {
          try {
            const duration = (Date.now() - startTimeRef.current) / 1000;
            const result = await analyzeAudio(questionId, sessionId, blob, duration);
            onAnalyzeComplete(result);
          } catch {
            onAnalyzeComplete(DEMO_ANALYZE_RESPONSE, true);
            setError(
              "STT/analysis unavailable — showing demo. Check ELEVENLABS_API_KEY and FastAPI."
            );
          }
        } finally {
          setLoading(false);
        }
      };
      mediaRecorderRef.current = recorder;
      startTimeRef.current = Date.now();
      recorder.start();
      setRecording(true);
    } catch {
      setError("Microphone access denied. Try a text answer instead.");
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  }

  async function handleVideoUpload(file: File) {
    await runAnalyze(
      () => analyzeAudio(questionId, sessionId, file, 0, file.name),
      DEMO_ANALYZE_RESPONSE
    );
    void postureData;
  }

  return (
    <OutputCard
      title="Practise your answer"
      action={
        <Button size="sm" variant="secondary" onClick={loadDemo} disabled={loading}>
          <FlaskConical className="mr-1.5 h-3.5 w-3.5" />
          Load demo answer
        </Button>
      }
    >
      <p className="mb-5 text-xl font-medium leading-snug text-on-surface">{questionText}</p>

      <div className="mb-4 flex flex-wrap gap-2">
        {modes.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setMode(m.id)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              mode === m.id
                ? "bg-secondary text-white"
                : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {error && (
        <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
          {error}
        </p>
      )}

      {mode === "text" && (
        <div className="space-y-3">
          <Textarea
            placeholder="Type your interview answer here…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={6}
          />
          <Button onClick={submitText} disabled={loading || !text.trim()}>
            {loading ? "Analyzing…" : "Submit & get coaching"}
          </Button>
        </div>
      )}

      {mode === "audio" && (
        <div className="flex flex-col items-center py-8 text-center">
          {recording && (
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-outline-variant bg-white px-4 py-1.5">
              <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
              <span className="text-xs font-semibold uppercase tracking-widest text-on-surface">
                Live recording
              </span>
            </div>
          )}

          <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-2xl bg-surface-container-low">
            <Mic className="h-10 w-10 text-secondary" />
          </div>

          {recording ? (
            <p className="mb-6 text-2xl font-semibold tabular-nums text-on-surface">
              {formatTime(elapsedSec)}
            </p>
          ) : loading ? (
            <p className="mb-6 text-sm text-on-surface-variant">
              Transcribing and analyzing…
            </p>
          ) : (
            <p className="mb-6 text-sm text-on-surface-variant">
              Record your answer. Native language is fine.
            </p>
          )}

          {recording ? (
            <button
              type="button"
              onClick={stopRecording}
              className="inline-flex w-full max-w-xs items-center justify-center gap-3 rounded-xl bg-red-700 px-6 py-4 text-sm font-semibold text-white transition-opacity hover:opacity-90 active:scale-[0.98]"
            >
              <Square className="h-4 w-4 fill-current" />
              End practice session
            </button>
          ) : (
            <Button
              onClick={startRecording}
              disabled={loading}
              className="w-full max-w-xs gap-2 py-3"
            >
              <Mic className="h-4 w-4" />
              Start recording
            </Button>
          )}
        </div>
      )}

      {mode === "video" && (
        <div className="space-y-4 py-2 text-center">
          <PostureAnalyzer onResult={setPostureData} />
          <p className="text-sm text-on-surface-variant">
            Upload a practice video for speech and posture coaching.
          </p>
          <input
            ref={videoInputRef}
            type="file"
            accept="video/*,audio/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleVideoUpload(file);
            }}
          />
          <Button onClick={() => videoInputRef.current?.click()} disabled={loading}>
            <Upload className="mr-2 h-4 w-4" />
            {loading ? "Analyzing…" : "Upload video"}
          </Button>
          <div className="flex items-center justify-center gap-2 text-xs text-on-surface-variant">
            <Video className="h-3 w-3" />
            Optional — posture signals when camera data is available
          </div>
        </div>
      )}
    </OutputCard>
  );
}
