import type { AnalyzeResponse } from "@/lib/api-types";

interface CoachTabsProps {
  result: AnalyzeResponse;
  isDemo?: boolean;
}

export function CoachTabs({ result, isDemo }: CoachTabsProps) {
  const speech = result.speech_analysis;
  const hesitation = speech?.hesitation_markers_detected ?? [];

  return (
    <div className="rounded-xl border border-border bg-white">
      <div className="divide-y divide-border px-5 py-1">
        <section className="py-3">
          <h5 className="mb-1 text-xs font-medium uppercase tracking-wide text-muted">Speech</h5>
          {hesitation.length > 0 ? (
            <p className="text-sm text-gray-700">{hesitation.join(", ")}</p>
          ) : (
            <p className="text-sm text-gray-700">—</p>
          )}
        </section>

        <section className="py-3">
          <h5 className="mb-1 text-xs font-medium uppercase tracking-wide text-muted">Delivery</h5>
          <p className="text-sm text-gray-700">
            {speech?.energy_delivery_score ?? "—"}
          </p>
        </section>

        <section className="py-3">
          <h5 className="mb-1 text-xs font-medium uppercase tracking-wide text-muted">Lesson</h5>
          <p className="text-sm text-gray-700">
            {result.script_analysis?.coaching_lesson ?? "—"}
          </p>
        </section>
      </div>

      {isDemo && (
        <p className="border-t border-border px-5 py-2 text-xs text-amber-700">Demo</p>
      )}
    </div>
  );
}
