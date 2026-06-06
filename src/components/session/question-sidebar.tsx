"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { Question } from "@/lib/api-types";
import { cn } from "@/lib/utils";
import { Plus, Sparkles, Trash2 } from "lucide-react";

interface QuestionSidebarProps {
  questions: Question[];
  activeQuestionId: string | null;
  onSelectQuestion: (id: string) => void;
  onAddQuestion: (text: string) => Promise<void>;
  onDeleteQuestion: (id: string) => Promise<void>;
  onGenerateMock: () => Promise<void>;
  scoredQuestionIds?: Set<string>;
  generating?: boolean;
}

export function QuestionSidebar({
  questions,
  activeQuestionId,
  onSelectQuestion,
  onAddQuestion,
  onDeleteQuestion,
  onGenerateMock,
  scoredQuestionIds = new Set(),
  generating = false,
}: QuestionSidebarProps) {
  const [text, setText] = useState("");
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleAdd() {
    if (!text.trim()) return;
    setAdding(true);
    try {
      await onAddQuestion(text.trim());
      setText("");
    } finally {
      setAdding(false);
    }
  }

  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <h3 className="text-sm font-semibold">Questions</h3>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-2 overflow-hidden">
        <div className="flex-1 space-y-1 overflow-y-auto">
          {questions.length === 0 && (
            <p className="py-1 text-sm text-muted">
              Add a question you&apos;re prepping for.
            </p>
          )}
          {questions.map((q, i) => (
            <div
              key={q.id}
              className={cn(
                "group flex items-start gap-1 rounded-lg border transition-colors",
                activeQuestionId === q.id
                  ? "border-brand-200 bg-brand-50"
                  : "border-transparent hover:bg-gray-50"
              )}
            >
              <button
                type="button"
                onClick={() => onSelectQuestion(q.id)}
                className={cn(
                  "min-w-0 flex-1 px-3 py-2 text-left text-sm",
                  activeQuestionId === q.id ? "text-brand-800" : "text-gray-900"
                )}
              >
                <span className="text-xs text-muted">Q{i + 1}</span>
                <p className="mt-0.5 line-clamp-3">{q.question_text}</p>
                {scoredQuestionIds.has(q.id) && (
                  <span className="mt-1 inline-block text-xs text-brand-600">Scored</span>
                )}
              </button>
              <button
                type="button"
                title="Delete question"
                disabled={deletingId === q.id}
                onClick={() => {
                  setDeletingId(q.id);
                  void onDeleteQuestion(q.id).finally(() => setDeletingId(null));
                }}
                className="mt-2 mr-1.5 shrink-0 rounded-md p-1.5 text-gray-400 opacity-70 transition-opacity hover:bg-red-50 hover:text-red-600 sm:opacity-0 sm:group-hover:opacity-100 disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>

        <div className="space-y-2 border-t border-border pt-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Your question"
              className="min-w-0 flex-1 rounded-lg border border-border px-3 py-2.5 text-sm min-h-[42px] placeholder:text-gray-400"
              onKeyDown={(e) => e.key === "Enter" && void handleAdd()}
            />
            <Button
              size="sm"
              onClick={() => void handleAdd()}
              disabled={adding || !text.trim()}
              className="h-[42px] w-[42px] shrink-0 p-0"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <Button
            size="sm"
            variant="secondary"
            className="w-full"
            onClick={() => void onGenerateMock()}
            disabled={generating}
          >
            <Sparkles className="mr-1.5 h-3.5 w-3.5" />
            {generating ? "Generating…" : "Generate mock"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
