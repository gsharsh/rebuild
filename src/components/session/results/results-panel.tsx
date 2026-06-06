"use client";

import { AudioPlayer } from "@/components/ui/audio-player";
import { OutputCard } from "@/components/ui/output-card";
import { ScoreRow } from "@/components/session/results/score-row";
import { ScriptDisplay } from "@/components/session/results/script-display";
import { ScriptSplitView } from "@/components/session/results/script-split-view";
import { CoachTabs } from "@/components/session/results/coach-tabs";
import type { AnalyzeResponse } from "@/lib/api-types";

interface ResultsPanelProps {
  result: AnalyzeResponse;
  isDemo?: boolean;
  loading?: boolean;
}

export function ResultsPanel({ result, isDemo, loading }: ResultsPanelProps) {
  if (loading) {
    return (
      <OutputCard title="Coaching results">
        <div className="flex items-center justify-center py-16 text-sm text-on-surface-variant">
          Analyzing your answer…
        </div>
      </OutputCard>
    );
  }

  const changes = result.script_analysis?.changes_made ?? [];
  const coachingFallback =
    result.script_analysis?.coaching_fallback === true ||
    result.script_analysis?.changes_made?.some((c) =>
      c.reason?.toLowerCase().includes("ai coaching")
    );

  return (
    <div className="space-y-4">
      {coachingFallback && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          AI coaching didn&apos;t run for this answer — you&apos;re seeing a placeholder.
          Check that FastAPI is running and your Gemini API key has quota left, then
          practise again.
        </p>
      )}
      <ScoreRow result={result} />
      <ScriptDisplay transcript={result.transcript} changes={changes} />
      <ScriptSplitView analysis={result.script_analysis} />
      <AudioPlayer src={result.coach_audio_url} label="Play audio advice" />
      <CoachTabs result={result} isDemo={isDemo} />
    </div>
  );
}
