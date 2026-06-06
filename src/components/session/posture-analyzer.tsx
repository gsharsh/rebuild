"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Video } from "lucide-react";
import {
  type PosePoint,
  type PostureFrame,
  type PostureResult,
  scorePostureFrames,
} from "@/lib/posture/scoring";

export type { PostureResult };

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

const FALLBACK_POSTURE: PostureResult = {
  score: 70,
  signals: [
    "Camera posture check could not confidently detect face landmarks",
    "Basic camera presence was available",
  ],
  suggestions: [
    "Keep your face centered and well lit.",
    "Keep notes near camera height so your eye line stays natural.",
  ],
  summary:
    "Camera posture check was limited, so this is a basic face-presence estimate.",
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
    leftHip: landmarks[23],
    rightHip: landmarks[24],
  };
}

function drawOverlay(canvas: HTMLCanvasElement, frame: PostureFrame) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (!frame.detected) return;

  const points = [
    frame.nose,
    frame.leftEye,
    frame.rightEye,
    frame.leftEar,
    frame.rightEar,
  ].filter(Boolean) as PosePoint[];

  ctx.fillStyle = "#2563eb";
  for (const point of points) {
    ctx.beginPath();
    ctx.arc(point.x * canvas.width, point.y * canvas.height, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  if (frame.leftEye && frame.rightEye) {
    ctx.strokeStyle = "#16a34a";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(frame.leftEye.x * canvas.width, frame.leftEye.y * canvas.height);
    ctx.lineTo(frame.rightEye.x * canvas.width, frame.rightEye.y * canvas.height);
    ctx.stroke();
  }
}

export function PostureAnalyzer({
  onResult,
}: {
  onResult: (result: PostureResult) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const landmarkerRef = useRef<PoseLandmarkerInstance | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);

  const [isModelLoading, setIsModelLoading] = useState(false);
  const [active, setActive] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [liveScoreEstimate, setLiveScoreEstimate] = useState<number | null>(null);
  const [result, setResult] = useState<PostureResult | null>(null);

  async function loadModel() {
    if (landmarkerRef.current) return landmarkerRef.current;
    setIsModelLoading(true);
    try {
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
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Posture model could not load. Showing a safe fallback."
      );
      setResult(FALLBACK_POSTURE);
      onResult(FALLBACK_POSTURE);
      return null;
    } finally {
      setIsModelLoading(false);
    }
  }

  async function startCamera() {
    setError("");
    setProgress(0);
    setLiveScoreEstimate(null);
    const model = await loadModel();
    if (!model) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 640, height: 480 },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setActive(true);
      }
    } catch {
      setError("Camera permission was denied or unavailable.");
      const fallback = {
        ...FALLBACK_POSTURE,
        summary:
          "Camera permission was denied, so posture coaching used a safe face-presence estimate.",
      };
      setResult(fallback);
      onResult(fallback);
    }
  }

  function stopCamera() {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    landmarkerRef.current?.close?.();
    landmarkerRef.current = null;
    setActive(false);
    setAnalyzing(false);
  }

  async function analyzePosture() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const landmarker = landmarkerRef.current;
    if (!video || !canvas || !landmarker) {
      onResult(FALLBACK_POSTURE);
      stopCamera();
      return;
    }

    setAnalyzing(true);
    setProgress(0);
    const frames: PostureFrame[] = [];
    const startedAt = performance.now();
    const durationMs = 5000;

    await new Promise<void>((resolve) => {
      const sample = () => {
        const now = performance.now();
        const elapsed = now - startedAt;
        setProgress(Math.min(100, Math.round((elapsed / durationMs) * 100)));

        try {
          const result = landmarker.detectForVideo(video, now);
          const frame = landmarksToFrame(result.landmarks?.[0]);
          frames.push(frame);
          drawOverlay(canvas, frame);

          if (frames.length % 12 === 0) {
            setLiveScoreEstimate(scorePostureFrames(frames).score);
          }
        } catch {
          frames.push({ detected: false });
        }

        if (elapsed < durationMs) {
          rafRef.current = requestAnimationFrame(sample);
        } else {
          resolve();
        }
      };
      rafRef.current = requestAnimationFrame(sample);
    });

    const result = scorePostureFrames(frames);
    setResult(result);
    onResult(result);
    setProgress(100);
    stopCamera();
  }

  return (
    <div className="space-y-3 rounded-xl border border-border bg-white p-4 text-left">
      <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
        <Video className="h-4 w-4" />
        Quick camera check
      </div>
      <p className="text-xs text-muted">
        Quick camera check for face framing, eye line, head stability, and fidgeting.
      </p>

      {active && (
        <div className="relative overflow-hidden rounded-lg bg-black">
          <video
            ref={videoRef}
            className="max-h-56 w-full object-cover"
            playsInline
            muted
          />
          <canvas
            ref={canvasRef}
            width={640}
            height={480}
            className="pointer-events-none absolute inset-0 h-full w-full"
          />
        </div>
      )}

      {(analyzing || liveScoreEstimate != null) && (
        <div className="space-y-1">
          <div className="h-2 overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-brand-600 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-muted">
            Analyzing eye line, head stability, and camera presence…
            {liveScoreEstimate != null ? ` Live estimate: ${liveScoreEstimate}` : ""}
          </p>
        </div>
      )}

      {error && <p className="text-xs text-amber-700">{error}</p>}

      {result && (
        <div className="rounded-lg bg-gray-50 p-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-gray-900">Posture score</p>
            <span className="rounded-full bg-white px-2.5 py-1 text-sm font-semibold text-brand-700 ring-1 ring-brand-200">
              {result.score}/100
            </span>
          </div>
          <p className="mt-2 text-sm text-gray-700">{result.summary}</p>
          {result.signals.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted">
                Signals
              </p>
              <ul className="mt-1 list-disc space-y-1 pl-4 text-sm text-gray-700">
                {result.signals.map((signal) => (
                  <li key={signal}>{signal}</li>
                ))}
              </ul>
            </div>
          )}
          {result.suggestions.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted">
                Suggestions
              </p>
              <ul className="mt-1 list-disc space-y-1 pl-4 text-sm text-gray-700">
                {result.suggestions.map((suggestion) => (
                  <li key={suggestion}>{suggestion}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {!active ? (
          <Button size="sm" variant="secondary" onClick={() => void startCamera()} disabled={isModelLoading}>
            {isModelLoading ? "Loading model…" : "Open Camera Check"}
          </Button>
        ) : (
          <>
            <Button size="sm" onClick={() => void analyzePosture()} disabled={analyzing}>
              {analyzing ? "Analyzing…" : "Analyze Posture"}
            </Button>
            <Button size="sm" variant="ghost" onClick={stopCamera}>
              Cancel
            </Button>
          </>
        )}
      </div>

      <p className="text-[11px] leading-relaxed text-muted">
        Runs locally in your browser. We only save posture scores and coaching notes,
        not webcam frames.
      </p>
    </div>
  );
}
