import type { ScriptAnalysis } from "@/lib/api-types";
import { ArrowRight } from "lucide-react";

interface ScriptSplitViewProps {
  analysis: ScriptAnalysis;
}

export function ScriptSplitView({ analysis }: ScriptSplitViewProps) {
  return (
    <div className="rounded-xl border border-border bg-white overflow-hidden">
      <div className="border-b border-border bg-gray-50 px-4 py-2">
        <h4 className="text-sm font-semibold text-gray-900">Improve script</h4>
        <p className="text-xs text-muted">Grammarly-style before & after coaching</p>
      </div>
      <div className="grid divide-y divide-border md:grid-cols-2 md:divide-x md:divide-y-0">
        <div className="p-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
            Original issues
          </p>
          <ul className="space-y-3">
            {analysis.changes_made.map((change, i) => (
              <li key={i} className="text-sm">
                <span className="rounded bg-red-50 px-1.5 py-0.5 text-red-800 line-through">
                  {change.original}
                </span>
                <p className="mt-1 text-xs text-muted">{change.reason}</p>
              </li>
            ))}
            {analysis.changes_made.length === 0 && (
              <li className="text-sm text-muted">No changes needed — great script!</li>
            )}
          </ul>
        </div>
        <div className="bg-brand-50/30 p-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-brand-700">
            Improved version
          </p>
          <p className="text-sm leading-relaxed text-gray-800">
            {analysis.improved_script}
          </p>
          {analysis.changes_made.length > 0 && (
            <div className="mt-4 space-y-2">
              {analysis.changes_made.map((change, i) => (
                <div key={i} className="flex items-start gap-2 text-xs">
                  <span className="rounded bg-red-50 px-1 text-red-700 line-through shrink-0">
                    {change.original}
                  </span>
                  <ArrowRight className="mt-0.5 h-3 w-3 shrink-0 text-muted" />
                  <span className="rounded bg-green-50 px-1 text-green-800">
                    {change.fixed}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      {analysis.coaching_lesson && (
        <div className="border-t border-border bg-brand-50 px-4 py-3">
          <p className="text-xs font-medium text-brand-800">Coaching lesson</p>
          <p className="mt-1 text-sm text-brand-900">{analysis.coaching_lesson}</p>
        </div>
      )}
    </div>
  );
}
