"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Mic, Square, Upload, Video } from "lucide-react";
import { PostureAnalyzer, type PostureResult } from "@/components/session/posture-analyzer";

type AnswerMode = "text" | "audio" | "native" | "video";

interface AnswerInputProps {
  sessionId: string;
  questionId: string;
  onSubmitStart?: () => void;
  onSubmitComplete: (result: Record<string, unknown>) => void;
}

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

export function AnswerInput({
  sessionId,
  questionId,
  onSubmitStart,
  onSubmitComplete,
}: AnswerInputProps) {
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

  async function submitText() {
    if (!text.trim()) return;
    setLoading(true);
    onSubmitStart?.();
    setError("");
    try {
      const res = await fetch("/api/answers/text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, questionId, originalText: text }),
      });
      if (!res.ok) throw new Error("Failed to submit answer");
      const data = await res.json();
      onSubmitComplete(data);
      setText("");
    } catch {
      setError("Could not analyze your answer. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function submitNative() {
    if (!text.trim()) return;
    setLoading(true);
    onSubmitStart?.();
    setError("");
    try {
      const res = await fetch("/api/answers/native", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          questionId,
          originalText: text,
          nativeLanguage,
        }),
      });
      if (!res.ok) throw new Error("Failed to submit answer");
      const data = await res.json();
      onSubmitComplete(data);
      setText("");
    } catch {
      setError("Could not analyze your answer. Please try again.");
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
        const duration = (Date.now() - startTimeRef.current) / 1000;
        await submitAudio(blob, duration);
        stream.getTracks().forEach((t) => t.stop());
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

  async function submitAudio(blob: Blob, durationSeconds: number) {
    setLoading(true);
    onSubmitStart?.();
    setError("");
    try {
      const formData = new FormData();
      formData.append("sessionId", sessionId);
      formData.append("questionId", questionId);
      formData.append("audio", blob, "recording.webm");
      formData.append("durationSeconds", String(durationSeconds));

      const res = await fetch("/api/answers/audio", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Failed to submit audio");
      const data = await res.json();
      onSubmitComplete(data);
    } catch {
      setError("Audio analysis unavailable. Try a text answer instead.");
    } finally {
      setLoading(false);
    }
  }

  async function handleVideoUpload(file: File) {
    setLoading(true);
    onSubmitStart?.();
    setError("");
    try {
      const formData = new FormData();
      formData.append("sessionId", sessionId);
      formData.append("questionId", questionId);
      formData.append("video", file);
      if (postureData) {
        formData.append("postureAnalysis", JSON.stringify(postureData));
      }

      const res = await fetch("/api/answers/video", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Failed to submit video");
      const data = await res.json();
      onSubmitComplete(data);
    } catch {
      setError("Video analysis unavailable. Try a text answer instead.");
    } finally {
      setLoading(false);
    }
  }

  const modes: { id: AnswerMode; label: string }[] = [
    { id: "text", label: "Text Answer" },
    { id: "audio", label: "Audio Answer" },
    { id: "native", label: "Native Language Prep" },
    { id: "video", label: "Video Upload" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {modes.map((m) => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
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
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {(mode === "text" || mode === "native") && (
        <div className="space-y-3">
          {mode === "native" && (
            <div>
              <label className="text-sm text-muted block mb-1">
                Your language
              </label>
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
          <Button
            onClick={mode === "native" ? submitNative : submitText}
            disabled={loading || !text.trim()}
          >
            {loading ? "Analyzing…" : "Submit & Get Coaching"}
          </Button>
        </div>
      )}

      {mode === "audio" && (
        <div className="text-center py-8 space-y-4">
          <p className="text-sm text-muted">
            Record your spoken answer. We&apos;ll transcribe it and provide
            speech coaching.
          </p>
          {recording ? (
            <Button variant="danger" onClick={stopRecording}>
              <Square className="h-4 w-4 mr-2" />
              Stop Recording
            </Button>
          ) : (
            <Button onClick={startRecording} disabled={loading}>
              <Mic className="h-4 w-4 mr-2" />
              Start Recording
            </Button>
          )}
          {loading && (
            <p className="text-sm text-muted">Transcribing and analyzing…</p>
          )}
        </div>
      )}

      {mode === "video" && (
        <div className="text-center py-4 space-y-4">
          <PostureAnalyzer onResult={setPostureData} />
          <p className="text-sm text-muted">
            Upload a practice video for speech and posture coaching.
          </p>
          <input
            ref={videoInputRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleVideoUpload(file);
            }}
          />
          <Button
            onClick={() => videoInputRef.current?.click()}
            disabled={loading}
          >
            <Upload className="h-4 w-4 mr-2" />
            {loading ? "Analyzing…" : "Upload Video"}
          </Button>
          <div className="flex items-center justify-center gap-2 text-xs text-muted">
            <Video className="h-3 w-3" />
            Optional — posture analysis when camera data is available
          </div>
        </div>
      )}
    </div>
  );
}
