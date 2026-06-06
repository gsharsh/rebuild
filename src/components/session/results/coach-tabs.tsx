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
            </div>
            {speech?.hesitation_markers_detected?.length > 0 && (
              <div>
                <p className="mb-1 font-medium text-gray-900">Hesitation markers</p>
                <p className="text-gray-600">
                  {speech.hesitation_markers_detected.join(", ")}
                </p>
              </div>
            )}
          </div>
        )}
        {tab === "delivery" && (
          <div className="space-y-2 text-gray-600">
            <p>
              Focus on steady pacing around 130–160 WPM for interview answers.
            </p>
            <p>
              Reduce filler words like &ldquo;like&rdquo;, &ldquo;I think&rdquo;, and &ldquo;kind of&rdquo;
              to sound more confident.
            </p>
            {speech?.energy_delivery_score && (
              <p className="rounded-lg bg-brand-50 px-3 py-2 text-brand-800">
                Your delivery: {speech.energy_delivery_score}
              </p>
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
