"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { Question } from "@/lib/api-types";
import { cn } from "@/lib/utils";
import { Plus, Sparkles, Trash2 } from "lucide-react";

interface QuestionSidebarProps {
  title?: string;
  emptyText?: string;
  generateLabel?: string;
  generatingLabel?: string;
  addPlaceholder?: string;
  itemPrefix?: string;
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
  title = "Questions",
  emptyText = "Add or generate a question to begin practising.",
  generateLabel = "Generate mock question",
  generatingLabel = "Generating…",
  addPlaceholder = "Type your own question…",
  itemPrefix = "Q",
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
        <h3 className="text-sm font-semibold">{title}</h3>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-2 overflow-hidden">
        <div className="flex-1 space-y-1 overflow-y-auto">
          {questions.length === 0 && (
            <p className="py-1 text-sm text-on-surface-variant">{emptyText}</p>
          )}
          {questions.map((q, i) => (
            <div
              key={q.id}
              className={cn(
                "group flex items-start gap-1 rounded-lg border transition-colors",
                activeQuestionId === q.id
                  ? "border-secondary bg-surface-container-low"
                  : "border-transparent hover:bg-surface-container-low"
              )}
            >
              <button
                type="button"
                onClick={() => onSelectQuestion(q.id)}
                className={cn(
                  "min-w-0 flex-1 px-3 py-2 text-left text-sm",
                  activeQuestionId === q.id ? "text-secondary-dark" : "text-on-surface"
                )}
              >
                <span className="text-xs text-on-surface-variant">
                  {itemPrefix}{i + 1}
                </span>
                <p className="mt-0.5 line-clamp-3">{q.question_text}</p>
                {scoredQuestionIds.has(q.id) && (
                  <span className="mt-1 inline-block text-xs text-secondary">Scored</span>
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
                className="mt-2 mr-1.5 shrink-0 rounded-md p-1.5 text-on-surface-variant opacity-70 transition-opacity hover:bg-red-50 hover:text-red-600 sm:opacity-0 sm:group-hover:opacity-100 disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>

        <div className="space-y-2 border-t border-outline-variant pt-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={addPlaceholder}
              className="min-h-[42px] min-w-0 flex-1 rounded-lg border border-outline-variant bg-white px-3 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-offset-2"
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
            {generating ? generatingLabel : generateLabel}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
