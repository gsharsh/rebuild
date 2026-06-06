"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { OutputCard } from "@/components/ui/output-card";
import { PostureAnalyzer, type PostureResult } from "@/components/session/posture-analyzer";
import { analyzeAudio, analyzeText } from "@/lib/api-client";
import { transcribeAudioFile, translateText } from "@/lib/elevenlabs-client";
import { DEMO_ANSWER, DEMO_ANALYZE_RESPONSE } from "@/lib/demo-data";
import type { AnalyzeResponse, AnswerMode } from "@/lib/api-types";
import {
  type PosePoint,
  type PostureFrame,
  scorePostureFrames,
} from "@/lib/posture/scoring";
import { Camera, CameraOff, FlaskConical, Mic, Square, Type } from "lucide-react";

interface PractisePanelProps {
  sessionId: string;
  questionId: string;
  questionText: string;
  title?: string;
  textPlaceholder?: string;
  audioHelp?: string;
  onAnalyzeStart: () => void;
  onAnalyzeComplete: (result: AnalyzeResponse, isDemo?: boolean) => void;
}

const RECORD_MIME_TYPES = [
  "video/webm;codecs=vp8,opus",
  "video/webm",
  "audio/webm;codecs=opus",
  "audio/webm",
];

const CAMERA_FALLBACK_POSTURE: PostureResult = {
  score: 70,
  signals: [
    "Camera was enabled for this recording",
    "Face-landmark analysis could not complete reliably",
  ],
  suggestions: [
    "Keep your face centered and well lit.",
    "Keep your notes near camera height and reduce head movement.",
  ],
  summary:
    "Camera was available, but detailed face-presence scoring was limited for this attempt.",
};

type PoseLandmarkerInstance = {
  detectForVideo: (
    video: HTMLVideoElement,
    timestamp: number
  ) => { landmarks?: PosePoint[][] };
  close?: () => void;
};

type PoseLandmarkerModule = {
  FilesetResolver: {
    forVisionTasks: (path: string) => Promise<unknown>;
  };
  PoseLandmarker: {
    createFromOptions: (
      fileset: unknown,
      options: Record<string, unknown>
    ) => Promise<PoseLandmarkerInstance>;
  };
};

function landmarksToFrame(landmarks?: PosePoint[]): PostureFrame {
  if (!landmarks || landmarks.length === 0) {
    return { detected: false };
  }
  return {
    detected: true,
    nose: landmarks[0],
    leftEye: landmarks[2],
    rightEye: landmarks[5],
    leftEar: landmarks[7],
    rightEar: landmarks[8],
    leftShoulder: landmarks[11],
    rightShoulder: landmarks[12],
  };
}

function splitPracticePrompt(text: string) {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length > 1 && lines[0].length <= 80) {
    return {
      heading: lines[0],
      body: lines.slice(1).join(" "),
    };
  }
  return { heading: "", body: text };
}

export function PractisePanel({
  sessionId,
  questionId,
  questionText,
  title = "Practise your answer",
  textPlaceholder = "Type your answer in any language. We'll turn it into clear English coaching.",
  audioHelp = "Record your spoken answer. Native language is fine.",
  onAnalyzeStart,
  onAnalyzeComplete,
}: PractisePanelProps) {
  const [mode, setMode] = useState<AnswerMode>("audio");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [showCameraCheck, setShowCameraCheck] = useState(false);
  const [error, setError] = useState("");
  const [postureData, setPostureData] = useState<PostureResult | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const landmarkerRef = useRef<PoseLandmarkerInstance | null>(null);
  const postureRafRef = useRef<number | null>(null);
  const postureFramesRef = useRef<PostureFrame[]>([]);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);
  const previewRef = useRef<HTMLVideoElement>(null);

  const modes: { id: AnswerMode; label: string; icon: typeof Mic }[] = [
    { id: "audio", label: "Speak", icon: Mic },
    { id: "text", label: "Text", icon: Type },
  ];
  const practicePrompt = splitPracticePrompt(questionText);

  useEffect(() => {
    return () => {
      if (postureRafRef.current) {
        cancelAnimationFrame(postureRafRef.current);
      }
      landmarkerRef.current?.close?.();
      recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  function loadDemo() {
    setText(DEMO_ANSWER);
    onAnalyzeStart();
    setLoading(true);
    setTimeout(() => {
      onAnalyzeComplete(DEMO_ANALYZE_RESPONSE, true);
      setLoading(false);
    }, 400);
  }

  async function submitText() {
    if (!text.trim()) return;
    setLoading(true);
    onAnalyzeStart();
    setError("");
    try {
      const translation = await translateText(text.trim(), "auto");
      const englishText = translation.translatedText?.trim() || text.trim();
      const result = await analyzeText({
        question_id: questionId,
        session_id: sessionId,
        original_text: englishText,
        native_language: translation.detectedLanguage ?? "auto",
      });
      onAnalyzeComplete(result);
      setText("");
    } catch {
      onAnalyzeComplete(DEMO_ANALYZE_RESPONSE, true);
      setText("");
      setError(
        "Translation or analysis unavailable — showing demo. Check ELEVENLABS_API_KEY and FastAPI."
      );
    } finally {
      setLoading(false);
    }
  }

  function cleanupRecordingStream() {
    if (postureRafRef.current) {
      cancelAnimationFrame(postureRafRef.current);
      postureRafRef.current = null;
    }
    recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
    recordingStreamRef.current = null;
    if (previewRef.current) {
      previewRef.current.srcObject = null;
    }
  }

  async function loadPracticePoseModel() {
    if (landmarkerRef.current) return landmarkerRef.current;
    const vision = (await import("@mediapipe/tasks-vision")) as PoseLandmarkerModule;
    const fileset = await vision.FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
    );
    const baseOptions = {
      modelAssetPath:
        "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task",
    };
    let landmarker: PoseLandmarkerInstance;
    try {
      landmarker = await vision.PoseLandmarker.createFromOptions(fileset, {
        baseOptions: { ...baseOptions, delegate: "GPU" },
        runningMode: "VIDEO",
        numPoses: 1,
      });
    } catch {
      landmarker = await vision.PoseLandmarker.createFromOptions(fileset, {
        baseOptions: { ...baseOptions, delegate: "CPU" },
        runningMode: "VIDEO",
        numPoses: 1,
      });
    }
    landmarkerRef.current = landmarker;
    return landmarker;
  }

  async function startRecordingPostureCapture() {
    if (!cameraEnabled || !previewRef.current) return;
    postureFramesRef.current = [];
    try {
      const landmarker = await loadPracticePoseModel();
      const sample = () => {
        const video = previewRef.current;
        if (!video) return;
        try {
          const result = landmarker.detectForVideo(video, performance.now());
          postureFramesRef.current.push(landmarksToFrame(result.landmarks?.[0]));
        } catch {
          postureFramesRef.current.push({ detected: false });
        }
        postureRafRef.current = requestAnimationFrame(sample);
      };
      postureRafRef.current = requestAnimationFrame(sample);
    } catch {
      setPostureData(CAMERA_FALLBACK_POSTURE);
      setError("Recording will continue, but live posture analysis could not load.");
    }
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: cameraEnabled
          ? { facingMode: "user", width: { ideal: 960 }, height: { ideal: 540 } }
          : false,
      });
      recordingStreamRef.current = stream;
      if (cameraEnabled && previewRef.current) {
        previewRef.current.srcObject = stream;
        await previewRef.current.play();
        void startRecordingPostureCapture();
      }

      const supportedMimeType = RECORD_MIME_TYPES.find((type) =>
        MediaRecorder.isTypeSupported(type)
      );
      const recorder = new MediaRecorder(
        stream,
        supportedMimeType ? { mimeType: supportedMimeType } : undefined
      );
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = async () => {
        const recordedType = recorder.mimeType || supportedMimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: recordedType });
        const duration = (Date.now() - startTimeRef.current) / 1000;
        const extension = recordedType.includes("wav") ? "wav" : "webm";
        const filename = cameraEnabled ? `practice-video.${extension}` : `practice-audio.${extension}`;
        const recordingPosture =
          cameraEnabled && postureFramesRef.current.length > 0
            ? scorePostureFrames(postureFramesRef.current)
            : cameraEnabled
              ? postureData ?? CAMERA_FALLBACK_POSTURE
              : postureData;
        if (recordingPosture) {
          setPostureData(recordingPosture);
        }
        cleanupRecordingStream();
        setLoading(true);
        onAnalyzeStart();
        setError("");
        try {
          const result = await analyzeAudio(
            questionId,
            sessionId,
            blob,
            duration,
            filename,
            cameraEnabled ? recordingPosture : null
          );
          onAnalyzeComplete(result);
        } catch {
          try {
            const stt = await transcribeAudioFile(blob, filename);
            const transcript = stt.transcript?.trim();
            if (!transcript || stt.error) {
              throw new Error(stt.message ?? "Transcription failed");
            }
            const result = await analyzeText({
              question_id: questionId,
              session_id: sessionId,
              original_text: transcript,
              native_language: stt.detectedLanguage ?? "auto",
            });
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
      cleanupRecordingStream();
      setError(cameraEnabled ? "Camera or microphone access was denied." : "Microphone access was denied.");
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  }

  return (
    <OutputCard
      title={title}
      action={
        <Button size="sm" variant="secondary" onClick={loadDemo} disabled={loading}>
          <FlaskConical className="mr-1.5 h-3.5 w-3.5" />
          Load demo answer
        </Button>
      }
    >
      <div className="mb-5">
        {practicePrompt.heading && (
          <h3 className="text-lg font-semibold text-gray-900">
            {practicePrompt.heading}
          </h3>
        )}
        <p className="mt-1 text-sm leading-relaxed text-gray-800">
          {practicePrompt.body}
        </p>
      </div>

      <div className="mb-5 inline-flex rounded-xl bg-gray-100 p-1">
        {modes.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setMode(item.id)}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                mode === item.id
                  ? "bg-brand-600 text-white shadow-sm"
                  : "text-gray-600 hover:bg-white"
              }`}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </button>
          );
        })}
      </div>

      {error && (
        <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
          {error}
        </p>
      )}

      {mode === "text" && (
        <div className="space-y-3">
          <Textarea
            placeholder={textPlaceholder}
            value={text}
            onChange={(event) => setText(event.target.value)}
            rows={7}
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted">
              ElevenLabs translation runs with auto-detection before English coaching.
            </p>
            <Button onClick={submitText} disabled={loading || !text.trim()}>
              {loading ? "Analyzing…" : "Submit & get coaching"}
            </Button>
          </div>
        </div>
      )}

      {mode === "audio" && (
        <div className="rounded-xl border border-border bg-white px-5 py-8 text-center">
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
            {cameraEnabled ? <Camera className="h-9 w-9" /> : <Mic className="h-9 w-9" />}
          </div>
          <p className="mx-auto max-w-xl text-sm leading-relaxed text-muted">
            {audioHelp}
          </p>
          <p className="mt-2 text-sm text-gray-700">
            {cameraEnabled
              ? "Camera is on: submit one recording for speech, emotion, and face-presence coaching."
              : "Audio-only is fastest. Turn camera on when you want posture and eye-line feedback too."}
          </p>

          <div className="mt-6 flex flex-col items-center gap-3">
            <div className="flex flex-wrap justify-center gap-2">
              <Button
                variant={cameraEnabled ? "secondary" : "ghost"}
                onClick={() => {
                  setCameraEnabled((current) => !current);
                  setShowCameraCheck(false);
                }}
                disabled={recording || loading}
              >
                {cameraEnabled ? (
                  <>
                    <CameraOff className="mr-2 h-4 w-4" />
                    Record audio only
                  </>
                ) : (
                  <>
                    <Camera className="mr-2 h-4 w-4" />
                    Add camera for posture
                  </>
                )}
              </Button>
              {cameraEnabled && !recording && (
                <Button
                  variant="ghost"
                  onClick={() => setShowCameraCheck((current) => !current)}
                  disabled={loading}
                >
                  {showCameraCheck ? "Hide camera check" : "Run quick camera check"}
                </Button>
              )}
            </div>

            {cameraEnabled && (
              <div className="w-full max-w-3xl space-y-3">
                {recording && (
                  <div className="overflow-hidden rounded-xl bg-black">
                    <video
                      ref={previewRef}
                      className="max-h-72 w-full object-cover"
                      playsInline
                      muted
                    />
                  </div>
                )}
                {!recording && (
                  <div className="rounded-xl border border-border bg-gray-50 p-4 text-left">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">
                          Posture coach armed
                        </p>
                        <p className="mt-1 text-xs leading-5 text-muted">
                          Your next camera recording will score face framing, eye line,
                          head stability, and fidgeting.
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-semibold text-brand-700 ring-1 ring-brand-200">
                        {postureData ? `${postureData.score}/100 ready` : "Ready on record"}
                      </span>
                    </div>
                    {postureData && (
                      <p className="mt-3 text-sm leading-6 text-gray-700">
                        {postureData.summary}
                      </p>
                    )}
                  </div>
                )}
                {!recording && showCameraCheck && (
                  <PostureAnalyzer onResult={setPostureData} />
                )}
              </div>
            )}

            {recording ? (
              <Button variant="danger" className="min-w-72" onClick={stopRecording}>
                <Square className="mr-2 h-4 w-4" />
                Stop and submit
              </Button>
            ) : (
              <Button className="min-w-72 bg-gray-950 hover:bg-gray-800" onClick={startRecording} disabled={loading}>
                {cameraEnabled ? <Camera className="mr-2 h-4 w-4" /> : <Mic className="mr-2 h-4 w-4" />}
                Start recording
              </Button>
            )}
          </div>

          {postureData && cameraEnabled && !recording && (
            <p className="mt-4 text-xs text-brand-700">
              Posture check ready: {postureData.score}/100 will be included with your next recording.
            </p>
          )}
          {loading && <p className="mt-4 text-sm text-muted">Transcribing and analyzing…</p>}
        </div>
      )}
    </OutputCard>
  );
}
