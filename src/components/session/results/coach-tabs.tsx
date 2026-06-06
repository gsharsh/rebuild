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
    <div className="overflow-hidden rounded-lg border border-outline-variant bg-surface-elevated">
      <div className="flex flex-wrap gap-1 border-b border-outline-variant px-4 py-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              tab === t.id
                ? "bg-secondary text-white"
                : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high"
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
              <div className="rounded-lg bg-surface-container-low px-3 py-2.5">
                <p className="text-xs text-on-surface-variant">Pace (WPM)</p>
                <p className="font-medium text-on-surface">
                  {speech?.pacing_words_per_minute != null
                    ? Math.round(speech.pacing_words_per_minute)
                    : "—"}
                </p>
              </div>
              <div className="rounded-lg bg-surface-container-low px-3 py-2.5">
                <p className="text-xs text-on-surface-variant">Energy</p>
                <p className="font-medium text-on-surface">
                  {speech?.energy_delivery_score ?? "—"}
                </p>
              </div>
              {speech?.filler_count != null && (
                <div className="rounded-lg bg-surface-container-low px-3 py-2.5">
                  <p className="text-xs text-on-surface-variant">Fillers</p>
                  <p className="font-medium text-on-surface">
                    {speech.filler_count}
                    {speech.filler_per_minute != null
                      ? ` / ${speech.filler_per_minute}/min`
                      : ""}
                  </p>
                </div>
              )}
              {speech?.pace_label && (
                <div className="rounded-lg bg-surface-container-low px-3 py-2.5">
                  <p className="text-xs text-on-surface-variant">Pace label</p>
                  <p className="font-medium capitalize text-on-surface">
                    {speech.pace_label.replaceAll("_", " ")}
                  </p>
                </div>
              )}
            </div>

            {speech?.hesitation_markers_detected &&
              speech.hesitation_markers_detected.length > 0 && (
                <div>
                  <p className="mb-2 text-sm font-semibold text-on-surface">
                    Hesitation markers
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {speech.hesitation_markers_detected.map((word) => (
                      <span
                        key={word}
                        className="rounded-md bg-white px-2 py-0.5 text-sm text-on-surface"
                      >
                        {word}
                      </span>
                    ))}
                  </div>
                  <p className="mt-2 text-sm text-on-surface-variant">
                    Pause instead of filler words.
                  </p>
                </div>
              )}

            {speech?.valence?.normalizedTags &&
              speech.valence.normalizedTags.length > 0 && (
                <div>
                  <p className="mb-1 text-sm font-semibold text-on-surface">
                    Delivery signals
                  </p>
                  <p className="text-sm text-on-surface-variant">
                    {speech.valence.normalizedTags.join(", ")}
                  </p>
                </div>
              )}
          </div>
        )}

        {tab === "delivery" && (
          <div className="space-y-4 text-on-surface">
            {result.coach_audio_url && (
              <div className="rounded-lg border border-secondary/20 bg-surface-container-low px-3 py-3">
                <p className="mb-2 text-sm font-semibold text-on-surface">
                  Coach readback
                </p>
                <audio controls src={result.coach_audio_url} className="w-full" />
                <p className="mt-2 text-xs text-on-surface-variant">
                  Listen to coaching with natural pronunciation and tone.
                </p>
              </div>
            )}

            <div className="rounded-lg border border-secondary/20 bg-white px-3 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-secondary">
                Coach focus
              </p>
              <p className="mt-1 font-medium text-on-surface">
                {speech?.valence?.primaryFocus
                  ? speech.valence.primaryFocus
                  : speech?.energy_delivery_score ?? "Overall delivery"}
              </p>
              {speech?.emotional_coach_text && (
                <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">
                  {speech.emotional_coach_text}
                </p>
              )}
            </div>

            {speech?.practice_targets && speech.practice_targets.length > 0 && (
              <div className="space-y-3">
                <div>
                  <p className="font-semibold text-on-surface">Practice loop</p>
                  <p className="text-xs text-on-surface-variant">
                    Repeat each target, then record again to compare.
                  </p>
                </div>
                {speech.practice_targets.map((target, index) => (
                  <div
                    key={`${target.type}-${index}`}
                    className="rounded-lg border border-outline-variant bg-surface-container-low p-3"
                  >
                    <p className="font-medium text-on-surface">{target.focus}</p>
                    <p className="mt-2 text-xs uppercase tracking-wide text-on-surface-variant">
                      Section
                    </p>
                    <p className="text-sm text-on-surface">{target.original}</p>
                    <p className="mt-2 text-xs uppercase tracking-wide text-on-surface-variant">
                      Demo
                    </p>
                    <p className="text-sm font-medium text-on-surface">{target.demo}</p>
                    <p className="mt-2 rounded-md bg-white px-2 py-1 text-sm text-on-surface-variant">
                      {target.practice_cue}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {speech?.feedback && speech.feedback.length > 0 && (
              <div className="space-y-2">
                <p className="font-semibold text-on-surface">Quick tips</p>
                {speech.feedback.map((item, index) => (
                  <p
                    key={index}
                    className="rounded-md bg-surface-container-low px-3 py-2 text-sm text-on-surface-variant"
                  >
                    {item}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "lesson" && (
          <p className="leading-relaxed text-on-surface">
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
