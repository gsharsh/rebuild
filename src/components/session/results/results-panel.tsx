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
        <div className="flex items-center justify-center py-16 text-sm text-muted">
          Analyzing your answer…
        </div>
      </OutputCard>
    );
  }

  const changes = result.script_analysis?.changes_made ?? [];

  return (
    <div className="space-y-4">
      <ScoreRow result={result} />
      <ScriptDisplay transcript={result.transcript} changes={changes} />
      <ScriptSplitView analysis={result.script_analysis} />
      <AudioPlayer
        src={result.coach_audio_url}
        label="Play audio advice"
        unavailableMessage={
          result.coach_audio_error ??
          result.speech_analysis?.coach_audio_error ??
          "Audio coaching is being generated. Try submitting again if it does not appear."
        }
      />
      <CoachTabs result={result} isDemo={isDemo} />
    </div>
  );
}
