import { ScoreCard } from "@/components/ui/score-card";
import type { AnalyzeResponse } from "@/lib/api-types";

interface ScoreRowProps {
  result: AnalyzeResponse;
  postureScore?: string | number | null;
}

function scriptScore(changesCount: number): string {
  if (changesCount === 0) return "Strong";
  if (changesCount <= 2) return "Good";
  if (changesCount <= 4) return "Fair";
  return "Needs work";
}

export function ScoreRow({ result, postureScore }: ScoreRowProps) {
  const wpm = result.speech_analysis?.pacing_words_per_minute;
  const changes = result.script_analysis?.changes_made?.length ?? 0;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <ScoreCard
        label="WPM"
        value={wpm != null ? String(Math.round(wpm)) : "—"}
        sublabel="Pacing"
        variant="accent"
      />
      <ScoreCard
        label="Script"
        value={scriptScore(changes)}
        sublabel={`${changes} improvement${changes !== 1 ? "s" : ""} suggested`}
      />
      <ScoreCard
        label="Posture"
        value={postureScore ?? "—"}
        sublabel="Camera & presence"
        variant="muted"
      />
    </div>
  );
}
