"use client";

import { useState } from "react";
import type { AnalyzeResponse } from "@/lib/api-types";
import { cn } from "@/lib/utils";

type CoachTab = "speech" | "delivery" | "lesson";

interface CoachTabsProps {
  result: AnalyzeResponse;
  isDemo?: boolean;
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
                    {speech.filler_count}
                    {speech.filler_per_minute != null
                      ? ` / ${speech.filler_per_minute}/min`
                      : ""}
                  </p>
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
                  <p className="mb-1 font-medium text-gray-900">
                    Delivery signals
                  </p>
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
            </div>
            {speech?.practice_targets && speech.practice_targets.length > 0 && (
              <div className="space-y-3">
                <div>
                  <p className="font-medium text-gray-900">Practice loop</p>
                  <p className="text-xs text-muted">
                    Repeat each target, then submit another recording to compare.
                  </p>
                </div>
                {speech.practice_targets.map((target, index) => (
                  <div
                    key={`${target.type}-${index}`}
                    className="rounded-lg border border-border p-3"
                  >
                    <p className="font-medium text-gray-900">{target.focus}</p>
                    <p className="mt-2 text-xs uppercase tracking-wide text-muted">
                      Section
                    </p>
                    <p className="text-gray-700">{target.original}</p>
                    <p className="mt-2 text-xs uppercase tracking-wide text-muted">
                      Demo
                    </p>
                    <p className="text-gray-900">{target.demo}</p>
                    <p className="mt-2 rounded-md bg-gray-50 px-2 py-1 text-gray-700">
                      {target.practice_cue}
                    </p>
                  </div>
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
