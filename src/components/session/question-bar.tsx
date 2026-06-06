"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Sparkles } from "lucide-react";

interface QuestionBarProps {
  onAdd: (text: string) => Promise<void>;
  onGenerate: () => Promise<void>;
  generating?: boolean;
  prominent?: boolean;
}

export function QuestionBar({
  onAdd,
  onGenerate,
  generating = false,
  prominent = false,
}: QuestionBarProps) {
  const [text, setText] = useState("");
  const [adding, setAdding] = useState(false);

  async function handleAdd() {
    if (!text.trim()) return;
    setAdding(true);
    try {
      await onAdd(text.trim());
      setText("");
    } finally {
      setAdding(false);
    }
  }

  if (prominent) {
    return (
      <div className="w-full rounded-2xl border border-border bg-white px-8 py-7 shadow-sm">
        <p className="mb-5 text-center text-sm text-muted">
          Or add one here to start practising.
        </p>
        <div className="flex gap-3">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Your question"
            className="min-w-0 flex-1 rounded-xl border border-border px-5 py-4 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/25 min-h-[52px]"
            onKeyDown={(e) => e.key === "Enter" && void handleAdd()}
          />
          <Button
            onClick={() => void handleAdd()}
            disabled={adding || !text.trim()}
            className="h-[52px] w-[52px] shrink-0 rounded-xl p-0"
          >
            <Plus className="h-5 w-5" />
          </Button>
        </div>
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            onClick={() => void onGenerate()}
            disabled={generating}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-muted transition-colors hover:bg-gray-50 hover:text-gray-700"
          >
            <Sparkles className="h-3.5 w-3.5" />
            {generating ? "Generating…" : "Generate mock"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-4 rounded-xl border border-border bg-white px-4 py-3">
      <div className="flex gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Your question"
          className="min-w-0 flex-1 rounded-lg border border-border px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
          onKeyDown={(e) => e.key === "Enter" && void handleAdd()}
        />
        <Button
          onClick={() => void handleAdd()}
          disabled={adding || !text.trim()}
          className="shrink-0 px-4"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <button
        type="button"
        onClick={() => void onGenerate()}
        disabled={generating}
        className="mt-2 inline-flex items-center gap-1 text-xs text-muted hover:text-gray-700"
      >
        <Sparkles className="h-3 w-3" />
        {generating ? "Generating…" : "Generate mock"}
      </button>
    </div>
  );
}
