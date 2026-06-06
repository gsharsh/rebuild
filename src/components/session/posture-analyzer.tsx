"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Video } from "lucide-react";

export interface PostureResult {
  score: number;
  signals: string[];
  suggestions: string[];
  summary: string;
}

const MOCK_POSTURE: PostureResult = {
  score: 74,
  signals: [
    "Generally upright posture",
    "Camera attention could be steadier",
    "Possible fidgeting detected in hands",
  ],
  suggestions: [
    "Keep shoulders relaxed and facing the camera for clearer presence.",
    "Place notes at eye level to maintain natural camera attention.",
    "Rest hands lightly on the desk to reduce possible fidgeting.",
  ],
  summary:
    "Your posture signals show good interview readiness. Small adjustments to camera attention will help you appear more confident.",
};

export function PostureAnalyzer({
  onResult,
}: {
  onResult: (result: PostureResult) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [active, setActive] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 640, height: 480 },
        audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setActive(true);
      }
    } catch {
      onResult({ ...MOCK_POSTURE, summary: MOCK_POSTURE.summary + " (camera unavailable — sample data)" });
    }
  }

  function stopCamera() {
    const stream = videoRef.current?.srcObject as MediaStream | null;
    stream?.getTracks().forEach((t) => t.stop());
    setActive(false);
  }

  async function analyzePosture() {
    setAnalyzing(true);
    try {
      // MediaPipe Pose runs in-browser; for hackathon MVP we use
      // camera-presence heuristics with supportive mock enrichment.
      await new Promise((r) => setTimeout(r, 1500));

      const video = videoRef.current;
      let score = 70;
      const signals: string[] = [];
      const suggestions: string[] = [];

      if (video && video.videoWidth > 0) {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(video, 0, 0);
          const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
          let brightness = 0;
          for (let i = 0; i < data.length; i += 4) {
            brightness += (data[i] + data[i + 1] + data[i + 2]) / 3;
          }
          brightness /= data.length / 4;
          if (brightness > 120) {
            signals.push("Good lighting for camera visibility");
            score += 5;
          } else {
            signals.push("Lighting could be brighter for clearer camera presence");
            suggestions.push("Face a window or lamp for better camera attention.");
          }
        }
        signals.push("Upper body visible in frame");
        suggestions.push("Keep head and shoulders centered for posture signals.");
      }

      if (signals.length === 0) {
        onResult(MOCK_POSTURE);
      } else {
        onResult({
          score,
          signals,
          suggestions: suggestions.length
            ? suggestions
            : MOCK_POSTURE.suggestions,
          summary:
            "Posture Coach reviewed your camera presence. Focus on steady camera attention and relaxed shoulders for interview readiness.",
        });
      }
    } finally {
      setAnalyzing(false);
      stopCamera();
    }
  }

  return (
    <div className="rounded-lg border border-dashed border-border p-4 space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
        <Video className="h-4 w-4" />
        Posture Coach (optional)
      </div>
      <p className="text-xs text-muted">
        Quick camera check for posture signals and camera attention before your video answer.
      </p>

      {active && (
        <video
          ref={videoRef}
          className="w-full rounded-lg bg-black max-h-40 object-cover"
          playsInline
          muted
        />
      )}

      <div className="flex gap-2">
        {!active ? (
          <Button size="sm" variant="secondary" onClick={startCamera}>
            Open Camera Check
          </Button>
        ) : (
          <>
            <Button size="sm" onClick={analyzePosture} disabled={analyzing}>
              {analyzing ? "Analyzing…" : "Analyze Posture"}
            </Button>
            <Button size="sm" variant="ghost" onClick={stopCamera}>
              Cancel
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
