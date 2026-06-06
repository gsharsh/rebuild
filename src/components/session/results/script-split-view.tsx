import type { ScriptAnalysis } from "@/lib/api-types";
import { ArrowRight, CheckCircle2 } from "lucide-react";

interface ScriptSplitViewProps {
  analysis: ScriptAnalysis;
}

export function ScriptSplitView({ analysis }: ScriptSplitViewProps) {
  const changes = analysis.changes_made ?? [];

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-white">
      <div className="border-b border-border bg-gray-50 px-5 py-4">
        <h4 className="text-base font-semibold text-gray-900">Improve script</h4>
        <p className="mt-1 text-sm text-muted">
          Cleaner wording for a speech that is easier to deliver out loud.
        </p>
      </div>

      <div className="space-y-5 p-5">
        <section className="rounded-xl bg-brand-50/60 p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-brand-700">
            <CheckCircle2 className="h-4 w-4" />
            Improved speaking version
          </div>
          <p className="whitespace-pre-wrap break-words text-base leading-8 text-gray-900">
            {analysis.improved_script}
          </p>
        </section>

        <section>
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-muted">
                Recommended edits
              </p>
              <p className="mt-1 text-sm text-gray-600">
                Sentence-level changes that improve clarity, rhythm, and confidence.
              </p>
            </div>
            {changes.length > 0 && (
              <span className="shrink-0 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                {changes.length} edit{changes.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          {changes.length === 0 ? (
            <div className="rounded-lg border border-border bg-gray-50 p-4 text-sm text-muted">
              No script changes needed. Keep practicing the delivery.
            </div>
          ) : (
            <div className="space-y-3">
              {changes.map((change, index) => (
                <article
                  key={`${change.original}-${index}`}
                  className="rounded-xl border border-border bg-white p-4 shadow-sm"
                >
                  <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
                    <div className="min-w-0">
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-red-700">
                        Before
                      </p>
                      <p className="whitespace-pre-wrap break-words rounded-lg bg-red-50 px-3 py-2 text-sm leading-6 text-red-900 line-through decoration-red-700/70">
                        {change.original}
                      </p>
                    </div>
                    <div className="hidden items-center justify-center text-muted lg:flex">
                      <ArrowRight className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-green-700">
                        Better for delivery
                      </p>
                      <p className="whitespace-pre-wrap break-words rounded-lg bg-green-50 px-3 py-2 text-sm leading-6 text-green-900">
                        {change.fixed}
                      </p>
                    </div>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-gray-600">{change.reason}</p>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
