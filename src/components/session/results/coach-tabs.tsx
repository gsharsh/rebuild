import type { AnalyzeResponse } from "@/lib/api-types";

interface CoachTabsProps {
  result: AnalyzeResponse;
  isDemo?: boolean;
}

export function CoachTabs({ result, isDemo }: CoachTabsProps) {
  const speech = result.speech_analysis;
  const hesitation = speech?.hesitation_markers_detected ?? [];
  const lesson =
    result.script_analysis?.coaching_lesson ??
    "Submit an answer to receive a personalised coaching lesson.";

  return (
    <div className="rounded-lg border border-outline-variant bg-surface-elevated">
      <div className="border-b border-outline-variant px-5 py-3">
        <h4 className="font-semibold text-on-surface">Coaching notes</h4>
      </div>

      <div className="space-y-3 p-4">
        <div className="rounded-lg bg-surface-container-low px-4 py-3">
          <p className="text-sm font-semibold text-on-surface">Speech</p>
          {hesitation.length > 0 ? (
            <>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {hesitation.map((word) => (
                  <span
                    key={word}
                    className="rounded-md bg-white px-2 py-0.5 text-sm text-on-surface"
                  >
                    {word}
                  </span>
                ))}
              </div>
              <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">
                Pause instead of filler words.
              </p>
            </>
          ) : (
            <p className="mt-1 text-sm leading-relaxed text-on-surface-variant">
              No hesitation markers detected.
            </p>
          )}
        </div>

        <div className="rounded-lg bg-surface-container-low px-4 py-3">
          <p className="text-sm font-semibold text-on-surface">Delivery</p>
          {speech?.energy_delivery_score && (
            <p className="mt-1 text-base text-on-surface">{speech.energy_delivery_score}</p>
          )}
          <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">
            Steady pace. Cut fillers when you want to sound more certain.
          </p>
        </div>

        <div className="rounded-lg border border-secondary/20 bg-white px-4 py-3">
          <p className="text-sm font-semibold text-secondary">Lesson</p>
          <p className="mt-2 text-base leading-relaxed text-on-surface">{lesson}</p>
        </div>
      </div>

      {isDemo && (
        <p className="border-t border-outline-variant px-5 py-2 text-xs text-amber-700">
          Demo mode
        </p>
      )}
    </div>
  );
}
