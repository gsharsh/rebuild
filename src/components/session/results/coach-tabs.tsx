"use client";

import { useRef, useState } from "react";
import type { AnalyzeResponse, SectionPracticeResult } from "@/lib/api-types";
import { analyzeSectionPractice } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { Mic, Play, Square, Volume2 } from "lucide-react";

type CoachTab = "speech" | "delivery" | "lesson";

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

  const hasOriginalClip =
    recordingUrl && target.start_time != null && target.end_time != null;

  async function playOriginalClip() {
    const audio = originalAudioRef.current;
    if (!audio || target.start_time == null) return;
    audio.currentTime = target.start_time;
    await audio.play();
  }

  async function playCoachDemo() {
    const audio = coachAudioRef.current;
    if (!audio) return;
    audio.currentTime = 0;
    await audio.play();
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

  async function playRetryCoach() {
    const audio = retryCoachAudioRef.current;
    if (!audio) return;
    audio.currentTime = 0;
    await audio.play();
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
          {target.title ?? target.focus}
        </p>
        <p className="mt-1 text-sm text-gray-600">{target.focus}</p>
      </button>

      {active && (
        <div className="mt-3 space-y-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => void playOriginalClip()}
              disabled={!hasOriginalClip}
              className="flex items-center justify-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Play className="h-4 w-4" />
              Play your version
            </button>
            <button
              type="button"
              onClick={() => void playCoachDemo()}
              disabled={!target.coach_audio_url}
              className="flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Volume2 className="h-4 w-4" />
              Play coach demo
            </button>
          </div>

          <div className="rounded-lg border border-brand-200 bg-white p-3">
            <p className="font-medium text-gray-900">Practice this section</p>
            <p className="mt-1 text-sm text-gray-600">
              Record only the improved version below. Speak it like the coach demo,
              then get fresh feedback for this drill.
            </p>
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
                  onClick={() => void playRetryCoach()}
                  className="inline-flex items-center gap-2 rounded-lg border border-border bg-white px-3 py-2 text-sm font-medium text-gray-700"
                >
                  <Volume2 className="h-4 w-4" />
                  Play retry feedback
                </button>
              )}
            </div>
            {analyzing && (
              <p className="mt-2 text-sm text-muted">Evaluating this section…</p>
            )}
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
            {practiceResult && (
              <div className="mt-3 space-y-2 rounded-md bg-gray-50 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-gray-900">
                    {practiceResult.status === "improved"
                      ? "Improved"
                      : "Keep practicing"}
                  </p>
                  {practiceResult.score != null && (
                    <span className="rounded-full bg-white px-2 py-0.5 text-xs text-gray-700">
                      {practiceResult.score}/100
                    </span>
                  )}
                </div>
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
                }
              }}
              className="hidden"
            />
          )}
          {target.coach_audio_url && (
            <audio ref={coachAudioRef} src={target.coach_audio_url} className="hidden" />
          )}

          <div>
            <p className="text-xs uppercase tracking-wide text-muted">What you said</p>
            <p className="text-gray-700">{target.original}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted">
              Improved version
            </p>
            <p className="font-medium text-gray-900">{target.demo}</p>
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
  const [tab, setTab] = useState<CoachTab>("speech");
  const speech = result.speech_analysis;

  const tabs: { id: CoachTab; label: string }[] = [
    { id: "speech", label: "Speech" },
    { id: "delivery", label: "Delivery" },
    { id: "lesson", label: "Lesson" },
  ];

  return (
    <div className="rounded-xl border border-border bg-white">
      <div className="flex flex-wrap gap-1 border-b border-border px-4 py-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "rounded-md px-3 py-1 text-xs font-medium transition-colors",
              tab === t.id
                ? "bg-brand-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="p-4 text-sm">
        {tab === "speech" && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-xs text-muted">Pace (WPM)</p>
                <p className="font-medium">
                  {speech?.pacing_words_per_minute != null
                    ? Math.round(speech.pacing_words_per_minute)
                    : "—"}
                </p>
              </div>
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-xs text-muted">Energy</p>
                <p className="font-medium">{speech?.energy_delivery_score ?? "—"}</p>
              </div>
              {speech?.filler_count != null && (
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-xs text-muted">Fillers</p>
                  <p className="font-medium">
                    {speech.filler_count === 0 ? "None detected" : speech.filler_count}
                    {speech.filler_per_minute != null
                      ? speech.filler_count === 0
                        ? ""
                        : ` / ${speech.filler_per_minute}/min`
                      : ""}
                  </p>
                  {speech.hesitation_markers_detected?.length > 0 && (
                    <p className="mt-1 text-xs text-muted">
                      {speech.hesitation_markers_detected.slice(0, 4).join(", ")}
                    </p>
                  )}
                </div>
              )}
              {speech?.pace_label && (
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-xs text-muted">Pace label</p>
                  <p className="font-medium capitalize">
                    {speech.pace_label.replaceAll("_", " ")}
                  </p>
                </div>
              )}
            </div>
            {speech?.hesitation_markers_detected?.length > 0 && (
              <div>
                <p className="mb-1 font-medium text-gray-900">Hesitation markers</p>
                <p className="text-gray-600">
                  {speech.hesitation_markers_detected.join(", ")}
                </p>
              </div>
            )}
            {speech?.valence?.normalizedTags &&
              speech.valence.normalizedTags.length > 0 && (
                <div>
                  <p className="mb-1 font-medium text-gray-900">Delivery signals</p>
                  <p className="text-gray-600">
                    {speech.valence.normalizedTags.join(", ")}
                  </p>
                </div>
              )}
          </div>
        )}
        {tab === "delivery" && (
          <div className="space-y-4 text-gray-700">
            {result.coach_audio_url && (
              <div className="rounded-lg bg-brand-50 px-3 py-2 text-brand-900">
                <p className="mb-2 font-medium">Coach demo</p>
                <audio controls src={result.coach_audio_url} className="w-full" />
              </div>
            )}
            <div className="rounded-lg bg-brand-50 px-3 py-3 text-brand-900">
              <p className="text-xs font-medium uppercase tracking-wide text-brand-700">
                Coach focus
              </p>
              <p className="mt-1 font-medium">
                {speech?.valence?.primaryFocus
                  ? speech.valence.primaryFocus
                  : speech?.energy_delivery_score ?? "Overall delivery"}
              </p>
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
          </div>
        )}
        {tab === "lesson" && (
          <p className="leading-relaxed text-gray-700">
            {result.script_analysis?.coaching_lesson ??
              "Submit an answer to receive a personalised coaching lesson."}
          </p>
        )}
        {isDemo && (
          <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
            Demo mode — sample coaching data shown.
          </p>
        )}
      </div>
    </div>
  );
}
