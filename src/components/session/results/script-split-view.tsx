import type { ScriptAnalysis } from "@/lib/api-types";

interface ScriptSplitViewProps {
  analysis: ScriptAnalysis;
}

export function ScriptSplitView({ analysis }: ScriptSplitViewProps) {
  const changes = analysis.changes_made ?? [];

  return (
    <div className="overflow-hidden rounded-lg border border-outline-variant bg-surface-elevated">
      <div className="border-b border-outline-variant bg-surface-container-low px-5 py-3">
        <h4 className="font-semibold text-on-surface">Improve script</h4>
        <p className="mt-0.5 text-sm text-on-surface-variant">
          Before and after coaching
        </p>
      </div>

      <div className="grid divide-y divide-outline-variant md:grid-cols-2 md:divide-x md:divide-y-0">
        <div className="p-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
            Original
          </p>
          <ul className="space-y-4">
            {changes.map((change, i) => (
              <li key={i}>
                <p className="rounded-md bg-red-50 px-2 py-1 text-sm leading-relaxed text-red-800 line-through decoration-red-400">
                  {change.original}
                </p>
                {change.reason && (
                  <p className="mt-2 text-sm leading-relaxed text-on-surface-variant">
                    {change.reason}
                  </p>
                )}
              </li>
            ))}
            {changes.length === 0 && (
              <li className="text-sm text-on-surface-variant">No changes needed.</li>
            )}
          </ul>
        </div>

        <div className="bg-surface-container-low/40 p-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-secondary">
            Improved
          </p>
          <p className="text-base leading-relaxed text-on-surface">
            {analysis.improved_script}
          </p>
          {changes.length > 0 && (
            <div className="mt-5 space-y-3 border-t border-outline-variant pt-4">
              {changes.map((change, i) => (
                <div key={i} className="space-y-1">
                  <p className="text-xs text-on-surface-variant line-through">
                    {change.original}
                  </p>
                  <p className="text-sm leading-relaxed text-green-800">
                    {change.fixed}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {analysis.coaching_lesson && (
        <div className="border-t border-outline-variant bg-surface-container-low px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-secondary">
            Coaching lesson
          </p>
          <p className="mt-2 text-sm leading-relaxed text-on-surface">
            {analysis.coaching_lesson}
          </p>
        </div>
      )}
    </div>
  );
}
