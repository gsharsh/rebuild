import type { ScriptChange } from "@/lib/api-types";

interface ScriptDisplayProps {
  transcript: string;
  changes: ScriptChange[];
}

function highlightTranscript(transcript: string, changes: ScriptChange[]): React.ReactNode {
  if (changes.length === 0) {
    return <span>{transcript}</span>;
  }

  let remaining = transcript;
  const parts: React.ReactNode[] = [];
  let key = 0;

  for (const change of changes) {
    const idx = remaining.toLowerCase().indexOf(change.original.toLowerCase());
    if (idx === -1) continue;

    if (idx > 0) {
      parts.push(<span key={key++}>{remaining.slice(0, idx)}</span>);
    }

    parts.push(
      <mark
        key={key++}
        className="rounded bg-amber-100 px-0.5 text-amber-900"
        title={change.reason}
      >
        {remaining.slice(idx, idx + change.original.length)}
      </mark>
    );

    remaining = remaining.slice(idx + change.original.length);
  }

  if (remaining) {
    parts.push(<span key={key++}>{remaining}</span>);
  }

  return parts.length > 0 ? parts : <span>{transcript}</span>;
}

export function ScriptDisplay({ transcript, changes }: ScriptDisplayProps) {
  return (
    <div className="rounded-xl border border-border bg-white p-4">
      <h4 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
        Your script
      </h4>
      <p className="text-sm leading-relaxed text-gray-800">
        {highlightTranscript(transcript, changes)}
      </p>
      {changes.length > 0 && (
        <p className="mt-3 text-xs text-muted">
          Highlighted phrases have suggested improvements below.
        </p>
      )}
    </div>
  );
}
