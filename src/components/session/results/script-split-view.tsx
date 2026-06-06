import type { ScriptAnalysis } from "@/lib/api-types";

interface ScriptSplitViewProps {
  analysis: ScriptAnalysis;
}

export function ScriptSplitView({ analysis }: ScriptSplitViewProps) {
  const changes = analysis.changes_made ?? [];

  return (
    <div className="rounded-xl border border-border bg-white">
      <div className="border-b border-border px-5 py-3">
        <h4 className="font-semibold text-gray-900">Improved script</h4>
      </div>

      <div className="space-y-4 px-5 py-4">
        <p className="text-base leading-relaxed text-gray-800">
          {analysis.improved_script}
        </p>

        {changes.length > 0 && (
          <div className="space-y-3">
            {changes.map((change, i) => (
              <div
                key={i}
                className="rounded-lg border border-border bg-gray-50/80 px-4 py-3"
              >
                <p className="text-sm leading-relaxed text-gray-500 line-through decoration-gray-400">
                  {change.original}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-gray-800">
                  {change.fixed}
                </p>
                {change.reason && (
                  <p className="mt-2 text-sm text-muted">{change.reason}</p>
                )}
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
