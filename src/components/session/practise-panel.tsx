"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { OutputCard } from "@/components/ui/output-card";
import { PostureAnalyzer, type PostureResult } from "@/components/session/posture-analyzer";
import { analyzeAudio, analyzeText } from "@/lib/api-client";
import { transcribeAudioFile, translateText } from "@/lib/elevenlabs-client";
import { DEMO_ANSWER, DEMO_ANALYZE_RESPONSE } from "@/lib/demo-data";
import type { AnalyzeResponse, AnswerMode } from "@/lib/api-types";
import { Mic, Square, Upload, Video, FlaskConical } from "lucide-react";

const NATIVE_LANGUAGES = [
  { code: "hi", label: "Hindi" },
  { code: "es", label: "Spanish" },
  { code: "zh", label: "Mandarin" },
  { code: "ar", label: "Arabic" },
  { code: "fr", label: "French" },
  { code: "te", label: "Telugu" },
  { code: "ta", label: "Tamil" },
  { code: "bn", label: "Bengali" },
];

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
  const [mode, setMode] = useState<AnswerMode>("text");
  const [text, setText] = useState("");
  const [nativeLanguage, setNativeLanguage] = useState("hi");
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState("");
  const [postureData, setPostureData] = useState<PostureResult | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const modes: { id: AnswerMode; label: string }[] = [
    { id: "text", label: "Text" },
    { id: "audio", label: "Speak" },
    { id: "native", label: "Native" },
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

  async function submitNative() {
    if (!text.trim()) return;
    setLoading(true);
    onAnalyzeStart();
    setError("");
    try {
      const translation = await translateText(text.trim(), nativeLanguage);
      if (translation.isMock && !translation.translatedText) {
        throw new Error("Translation unavailable");
      }
      const englishText = translation.translatedText;
      const result = await analyzeText({
        question_id: questionId,
        session_id: sessionId,
        original_text: englishText,
        native_language: nativeLanguage,
      });
      onAnalyzeComplete(result);
      setText("");
    } catch {
      onAnalyzeComplete(DEMO_ANALYZE_RESPONSE, true);
      setText("");
      setError(
        "Translation or analysis unavailable — showing demo. Check ELEVENLABS_API_KEY in .env."
      );
    } finally {
      setLoading(false);
    }
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
      <p className="mb-4 text-sm leading-relaxed text-gray-800">{questionText}</p>

      <div className="mb-4 flex flex-wrap gap-2">
        {modes.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setMode(m.id)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              mode === m.id
                ? "bg-brand-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
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

      {(mode === "text" || mode === "native") && (
        <div className="space-y-3">
          {mode === "native" && (
            <div>
              <label className="mb-1 block text-sm text-muted">Your language</label>
              <select
                value={nativeLanguage}
                onChange={(e) => setNativeLanguage(e.target.value)}
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm"
              >
                {NATIVE_LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.label}
                  </option>
                ))}
              </select>
            </div>
          )}
          <Textarea
            placeholder={
              mode === "native"
                ? "Write your answer in your native language…"
                : "Type your interview answer here…"
            }
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={6}
          />
          <Button onClick={mode === "native" ? submitNative : submitText} disabled={loading || !text.trim()}>
            {loading ? "Analyzing…" : "Submit & get coaching"}
          </Button>
        </div>
      )}

      {mode === "audio" && (
        <div className="space-y-4 py-6 text-center">
          <p className="text-sm text-muted">
            Record your spoken answer. We&apos;ll transcribe it and provide speech coaching.
          </p>
          {recording ? (
            <Button variant="danger" onClick={stopRecording}>
              <Square className="mr-2 h-4 w-4" />
              Stop recording
            </Button>
          ) : (
            <Button onClick={startRecording} disabled={loading}>
              <Mic className="mr-2 h-4 w-4" />
              Start recording
            </Button>
          )}
          {loading && <p className="text-sm text-muted">Transcribing and analyzing…</p>}
        </div>
      )}

      {mode === "video" && (
        <div className="space-y-4 py-2 text-center">
          <PostureAnalyzer onResult={setPostureData} />
          <p className="text-sm text-muted">
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
          <div className="flex items-center justify-center gap-2 text-xs text-muted">
            <Video className="h-3 w-3" />
            Optional — posture signals when camera data is available
          </div>
        </div>
      )}
    </OutputCard>
  );
}
