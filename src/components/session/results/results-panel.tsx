"use client";

import { AudioPlayer } from "@/components/ui/audio-player";
import { OutputCard } from "@/components/ui/output-card";
import { ScoreRow } from "@/components/session/results/score-row";
import { ScriptDisplay } from "@/components/session/results/script-display";
import { ScriptSplitView } from "@/components/session/results/script-split-view";
import { CoachTabs } from "@/components/session/results/coach-tabs";
import type { AnalyzeResponse, PostureAnalysis } from "@/lib/api-types";

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
  const posture =
    result.posture_analysis?.framesAnalyzed && result.posture_analysis.detectedRatio
      ? result.posture_analysis
      : null;

  return (
    <div className="space-y-4">
      <ScoreRow result={result} posture={posture} />
      <PostureAdvice posture={posture} />
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

function PostureAdvice({ posture }: { posture: PostureAnalysis | null }) {
  if (!posture) return null;

  const primarySuggestion = posture.suggestions[0];
  const supportingSignals = posture.signals.slice(0, 3);

  return (
    <div className="rounded-xl border border-border bg-white p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h4 className="text-sm font-semibold text-gray-900">Posture coaching</h4>
          <p className="mt-1 text-sm leading-6 text-gray-700">{posture.summary}</p>
        </div>
        {primarySuggestion && (
          <div className="shrink-0 rounded-lg bg-amber-50 px-3 py-2 text-sm leading-6 text-amber-950 md:max-w-md">
            <span className="font-semibold text-amber-800">Try next: </span>
            {primarySuggestion}
          </div>
        )}
      </div>
      {supportingSignals.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {supportingSignals.map((signal) => (
            <span
              key={signal}
              className="rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-800"
            >
              {signal}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
