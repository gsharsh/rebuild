import { ScoreCard } from "@/components/ui/score-card";
import type { AnalyzeResponse, PostureAnalysis } from "@/lib/api-types";
import type { ReactNode } from "react";

interface ScoreRowProps {
  result: AnalyzeResponse;
  posture?: PostureAnalysis | null;
}

function scriptScore(changesCount: number): string {
  if (changesCount === 0) return "Strong";
  if (changesCount <= 2) return "Good";
  if (changesCount <= 4) return "Fair";
  return "Needs work";
}

function formatToneLabel(value: string): string {
  return value
    .replaceAll("_", " ")
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function ToneBadges({ tags }: { tags: string[] }) {
  if (tags.length === 0) return <span>—</span>;

  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.slice(0, 3).map((tag) => (
        <span
          key={tag}
          className="rounded-full bg-white/80 px-2.5 py-1 text-sm font-semibold text-gray-900 ring-1 ring-brand-200"
        >
          {formatToneLabel(tag)}
        </span>
      ))}
    </div>
  );
}

function toneSummary(result: AnalyzeResponse): { value: ReactNode; sublabel: string } {
  const valence = result.speech_analysis?.valence;
  const tags = valence?.normalizedTags ?? [];
  const focus = valence?.primaryFocus;

  if (focus) {
    return {
      value: <ToneBadges tags={tags.length > 0 ? tags : [focus]} />,
      sublabel: `Focus: ${formatToneLabel(focus)}`,
    };
  }

  if (tags.length > 0) {
    return {
      value: <ToneBadges tags={tags} />,
      sublabel: "Detected from voice tone",
    };
  }

  return { value: "—", sublabel: "Emotion & tone" };
}

function PaceGraph({
  timeline,
}: {
  timeline?: Array<{ start: number; end: number; wpm: number; word_count: number }>;
}) {
  if (!timeline || timeline.length === 0) {
    return <span className="text-lg font-semibold">—</span>;
  }

  const maxWpm = Math.max(180, ...timeline.map((point) => point.wpm));
  const points = timeline.map((point, index) => {
    const x = timeline.length === 1 ? 50 : (index / (timeline.length - 1)) * 100;
    const y = 36 - Math.min(point.wpm / maxWpm, 1) * 30;
    return `${x},${y}`;
  });

  return (
    <div>
      <svg viewBox="0 0 100 40" className="h-12 w-full" aria-label="Pace over time">
        <line x1="0" y1="30" x2="100" y2="30" stroke="#dbe3f0" strokeWidth="1" />
        <polyline
          points={points.join(" ")}
          fill="none"
          stroke="#2563eb"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {timeline.map((point, index) => {
          const x = timeline.length === 1 ? 50 : (index / (timeline.length - 1)) * 100;
          const y = 36 - Math.min(point.wpm / maxWpm, 1) * 30;
          return <circle key={`${point.start}-${point.end}`} cx={x} cy={y} r="2.4" fill="#2563eb" />;
        })}
      </svg>
      <p className="text-xs text-muted">
        {timeline.map((point) => `${Math.round(point.wpm)}`).join(" / ")} WPM
      </p>
    </div>
  );
}

function postureSummary(posture?: PostureAnalysis | null): { value: string; sublabel: string } {
  if (!posture) {
    return {
      value: "Not checked",
      sublabel: "Turn camera on for posture advice",
    };
  }

  const firstSuggestion = posture.suggestions?.[0];
  if (posture.score >= 85) {
    return {
      value: "Strong presence",
      sublabel: posture.signals?.[0] ?? "Keep your eye contact steady",
    };
  }
  if (posture.score >= 70) {
    return {
      value: "Good presence",
      sublabel: firstSuggestion ?? "Keep your face centered and eye contact steady",
    };
  }
  return {
    value: "Needs attention",
    sublabel: firstSuggestion ?? "Center your face and reduce head movement",
  };
}

export function ScoreRow({ result, posture }: ScoreRowProps) {
  const wpm = result.speech_analysis?.pacing_words_per_minute;
  const changes = result.script_analysis?.changes_made?.length ?? 0;
  const tone = toneSummary(result);
  const postureCoach = postureSummary(posture);

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <ScoreCard
        label="Pace"
        value={<PaceGraph timeline={result.speech_analysis?.pace_timeline} />}
        sublabel={wpm != null ? `Average ${Math.round(wpm)} WPM` : "Over time"}
        variant="accent"
      />
      <ScoreCard
        label="Script"
        value={scriptScore(changes)}
        sublabel={`${changes} improvement${changes !== 1 ? "s" : ""} suggested`}
      />
      <ScoreCard
        label="Emotion & tone"
        value={tone.value}
        sublabel={tone.sublabel}
        variant="accent"
      />
      <ScoreCard
        label="Posture"
        value={postureCoach.value}
        sublabel={postureCoach.sublabel}
        variant="muted"
      />
    </div>
  );
}
