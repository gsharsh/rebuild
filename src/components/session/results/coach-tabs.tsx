"use client";

import { useRef, useState } from "react";
import type { AnalyzeResponse, SectionPracticeResult } from "@/lib/api-types";
import { analyzeSectionPractice } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { Mic, Pause, Play, Square, Volume2 } from "lucide-react";

interface CoachTabsProps {
  result: AnalyzeResponse;
  isDemo?: boolean;
}

type PracticeTarget = NonNullable<
  AnalyzeResponse["speech_analysis"]["practice_targets"]
>[number];

function PracticeTargetCard({
  target,
  index,
  recordingUrl,
}: {
  target: PracticeTarget;
  index: number;
  recordingUrl?: string | null;
}) {
  const originalAudioRef = useRef<HTMLAudioElement>(null);
  const coachAudioRef = useRef<HTMLAudioElement>(null);
  const retryCoachAudioRef = useRef<HTMLAudioElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);
  const [active, setActive] = useState(false);
  const [recording, setRecording] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [practiceResult, setPracticeResult] = useState<SectionPracticeResult | null>(null);
  const [error, setError] = useState("");
  const [playingOriginal, setPlayingOriginal] = useState(false);
  const [playingCoach, setPlayingCoach] = useState(false);
  const [playingRetryCoach, setPlayingRetryCoach] = useState(false);
  const title = target.title ?? target.focus;
  const showFocus = target.focus && target.focus.toLowerCase() !== title.toLowerCase();
  const improvedScript = target.demo || target.original || target.practice_cue;

  const hasOriginalClip =
    recordingUrl && target.start_time != null && target.end_time != null;

  async function toggleOriginalClip() {
    const audio = originalAudioRef.current;
    if (!audio || target.start_time == null) return;
    if (playingOriginal) {
      audio.pause();
      setPlayingOriginal(false);
      return;
    }
    const clipEnd = target.end_time ?? audio.duration;
    if (
      audio.currentTime < target.start_time ||
      (clipEnd && audio.currentTime >= clipEnd)
    ) {
      audio.currentTime = target.start_time;
    }
    await audio.play();
    setPlayingOriginal(true);
  }

  async function toggleCoachDemo() {
    const audio = coachAudioRef.current;
    if (!audio) return;
    if (playingCoach) {
      audio.pause();
      setPlayingCoach(false);
      return;
    }
    if (audio.ended) audio.currentTime = 0;
    await audio.play();
    setPlayingCoach(true);
  }

  async function startPracticeRecording() {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const supportedMimeTypes = ["audio/wav", "audio/webm;codecs=opus", "audio/webm"];
      const mimeType = supportedMimeTypes.find((type) =>
        MediaRecorder.isTypeSupported(type)
      );
      const recorder = new MediaRecorder(
        stream,
        mimeType ? { mimeType } : undefined
      );
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = async () => {
        const recordedType = recorder.mimeType || mimeType || "audio/webm";
        const extension = recordedType.includes("wav") ? "wav" : "webm";
        const blob = new Blob(chunksRef.current, { type: recordedType });
        const duration = (Date.now() - startTimeRef.current) / 1000;
        stream.getTracks().forEach((track) => track.stop());
        setAnalyzing(true);
        try {
          const result = await analyzeSectionPractice(
            target as unknown as Record<string, unknown>,
            blob,
            duration,
            `section-practice.${extension}`
          );
          setPracticeResult(result);
        } catch (caught) {
          setError(caught instanceof Error ? caught.message : "Could not analyze this retry.");
        } finally {
          setAnalyzing(false);
        }
      };
      mediaRecorderRef.current = recorder;
      startTimeRef.current = Date.now();
      recorder.start();
      setRecording(true);
    } catch {
      setError("Microphone access denied. Try again after enabling microphone access.");
    }
  }

  function stopPracticeRecording() {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  }

  async function toggleRetryCoach() {
    const audio = retryCoachAudioRef.current;
    if (!audio) return;
    if (playingRetryCoach) {
      audio.pause();
      setPlayingRetryCoach(false);
      return;
    }
    if (audio.ended) audio.currentTime = 0;
    await audio.play();
    setPlayingRetryCoach(true);
  }

  return (
    <div
      className={cn(
        "rounded-lg border border-border p-3 transition-colors",
        active ? "bg-brand-50/60" : "bg-white"
      )}
    >
      <button
        type="button"
        onClick={() => setActive((open) => !open)}
        className="w-full text-left"
      >
        <p className="text-xs font-medium uppercase tracking-wide text-brand-700">
          Drill {index + 1}
        </p>
        <p className="mt-1 font-medium text-gray-900">
          {title}
        </p>
        {showFocus && <p className="mt-1 text-sm text-gray-600">{target.focus}</p>}
      </button>

      {active && (
        <div className="mt-3 space-y-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => void toggleOriginalClip()}
              disabled={!hasOriginalClip}
              className="flex items-center justify-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {playingOriginal ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {playingOriginal ? "Pause your version" : "Play your version"}
            </button>
            <button
              type="button"
              onClick={() => void toggleCoachDemo()}
              disabled={!target.coach_audio_url}
              className="flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {playingCoach ? <Pause className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              {playingCoach ? "Pause coach demo" : "Play coach demo"}
            </button>
          </div>

          <div className="rounded-lg border border-brand-200 bg-white p-3">
            <p className="font-medium text-gray-900">Practice this section</p>
            <p className="mt-1 text-sm text-gray-600">
              Practice the improved speaking version below. Record it, then compare.
            </p>
            <div className="mt-3 rounded-lg bg-brand-50/70 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">
                Better for delivery
              </p>
              <p className="mt-1 text-base font-semibold leading-7 text-gray-950">
                {improvedScript}
              </p>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {recording ? (
                <button
                  type="button"
                  onClick={stopPracticeRecording}
                  className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white"
                >
                  <Square className="h-4 w-4" />
                  Stop & evaluate
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void startPracticeRecording()}
                  disabled={analyzing}
                  className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                  <Mic className="h-4 w-4" />
                  {practiceResult ? "Practice again" : "Practice this section"}
                </button>
              )}
              {practiceResult?.coach_audio_url && (
                <button
                  type="button"
                  onClick={() => void toggleRetryCoach()}
                  className="inline-flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-sm font-medium text-gray-700"
                >
                  {playingRetryCoach ? <Pause className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                  {playingRetryCoach ? "Pause retry feedback" : "Play retry feedback"}
                </button>
              )}
            </div>
            {analyzing && (
              <p className="mt-2 text-sm text-muted">Evaluating this section...</p>
            )}
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
            {practiceResult && (
              <div className="mt-3 space-y-2 rounded-md bg-gray-50 p-3">
                <p className="font-medium text-gray-900">
                  {practiceResult.status === "improved"
                    ? "Improved"
                    : "Keep practicing"}
                </p>
                <p className="text-xs uppercase tracking-wide text-muted">
                  Your retry
                </p>
                <p className="text-gray-700">{practiceResult.transcript}</p>
                {practiceResult.strength && (
                  <p className="text-sm text-emerald-700">
                    {practiceResult.strength}
                  </p>
                )}
                <p className="text-sm text-gray-700">{practiceResult.feedback}</p>
                <p className="rounded-md bg-white px-2 py-1 text-sm text-gray-700">
                  Next: {practiceResult.next_cue}
                </p>
                {practiceResult.coach_audio_error && (
                  <p className="text-xs text-amber-700">
                    {practiceResult.coach_audio_error}
                  </p>
                )}
              </div>
            )}
            {practiceResult?.coach_audio_url && (
              <audio
                ref={retryCoachAudioRef}
                src={practiceResult.coach_audio_url}
                onEnded={() => setPlayingRetryCoach(false)}
                onPause={() => setPlayingRetryCoach(false)}
                className="hidden"
              />
            )}
          </div>

          {recordingUrl && (
            <audio
              ref={originalAudioRef}
              src={recordingUrl}
              onTimeUpdate={(event) => {
                if (
                  target.end_time != null &&
                  event.currentTarget.currentTime >= target.end_time
                ) {
                  event.currentTarget.pause();
                  setPlayingOriginal(false);
                }
              }}
              onEnded={() => setPlayingOriginal(false)}
              onPause={() => setPlayingOriginal(false)}
              className="hidden"
            />
          )}
          {target.coach_audio_url && (
            <audio
              ref={coachAudioRef}
              src={target.coach_audio_url}
              onEnded={() => setPlayingCoach(false)}
              onPause={() => setPlayingCoach(false)}
              className="hidden"
            />
          )}

          <div>
            <p className="text-xs uppercase tracking-wide text-muted">What you said</p>
            <p className="text-gray-700">{target.original}</p>
          </div>
          {target.reason && <p className="text-sm text-gray-600">{target.reason}</p>}
          <p className="rounded-md bg-gray-50 px-2 py-1 text-gray-700">
            {target.practice_cue}
          </p>
          {target.coach_audio_error && (
            <p className="text-xs text-amber-700">{target.coach_audio_error}</p>
          )}
        </div>
      )}
    </div>
  );
}

export function CoachTabs({ result, isDemo }: CoachTabsProps) {
  const speech = result.speech_analysis;
  const focus = speech?.valence?.primaryFocus
    ? speech.valence.primaryFocus.replaceAll("_", " ")
    : speech?.energy_delivery_score ?? "Overall delivery";

  return (
    <div className="rounded-xl border border-border bg-white">
      <div className="border-b border-border bg-gray-50 px-5 py-4">
        <h4 className="text-base font-semibold text-gray-900">Delivery coaching</h4>
        <p className="mt-1 text-sm text-muted">
          Practice the sections that will make the biggest difference in your next take.
        </p>
      </div>

      <div className="space-y-5 p-5 text-sm">
        {result.coach_audio_url && (
          <div className="rounded-lg bg-brand-50 px-3 py-3 text-brand-900">
            <p className="mb-2 font-medium">Coach audio</p>
            <audio controls src={result.coach_audio_url} className="w-full" />
          </div>
        )}

        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
          <div className="rounded-lg bg-brand-50 px-3 py-3 text-brand-900">
            <p className="text-xs font-medium uppercase tracking-wide text-brand-700">
              Coach focus
            </p>
            <p className="mt-1 text-lg font-semibold capitalize">{focus}</p>
            {speech?.emotional_coach_text && (
              <p className="mt-2 leading-relaxed text-brand-800">
                {speech.emotional_coach_text}
              </p>
            )}
            {speech?.valence_insight && (
              <p className="mt-2 rounded-md bg-white/70 px-2 py-2 text-brand-800">
                {speech.valence_insight}
              </p>
            )}
          </div>

          <div className="rounded-lg bg-gray-50 px-3 py-3 text-gray-800">
            <p className="text-xs font-medium uppercase tracking-wide text-muted">
              Coaching lesson
            </p>
            <p className="mt-2 leading-relaxed">
              {result.script_analysis?.coaching_lesson ??
                "Submit an answer to receive a personalised coaching lesson."}
            </p>
          </div>
        </div>

        {speech?.practice_targets && speech.practice_targets.length > 0 && (
          <div className="space-y-3">
            <div>
              <p className="font-medium text-gray-900">Sections to practise</p>
              <p className="text-xs text-muted">
                Repeat each section, then submit another recording to compare.
              </p>
            </div>
            {speech.practice_targets.map((target, index) => (
              <PracticeTargetCard
                key={`${target.type}-${index}`}
                target={target}
                index={index}
                recordingUrl={result.recording_url}
              />
            ))}
          </div>
        )}

        {speech?.feedback && speech.feedback.length > 0 && (
          <div className="space-y-2">
            <p className="font-medium text-gray-900">Quick tips</p>
            {speech.feedback.map((item, index) => (
              <p key={index} className="rounded-md bg-gray-50 px-3 py-2">
                {item}
              </p>
            ))}
          </div>
        )}

        {isDemo && (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
            Demo mode - sample coaching data shown.
          </p>
        )}
      </div>
    </div>
  );
}
