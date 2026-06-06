"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { Question } from "@/lib/api-types";
import { cn } from "@/lib/utils";
import { Plus, Sparkles } from "lucide-react";

interface QuestionSidebarProps {
  questions: Question[];
  activeQuestionId: string | null;
  onSelectQuestion: (id: string) => void;
  onAddQuestion: (text: string) => Promise<void>;
  onGenerateMock: () => Promise<void>;
  scoredQuestionIds?: Set<string>;
  generating?: boolean;
}

export function QuestionSidebar({
  questions,
  activeQuestionId,
  onSelectQuestion,
  onAddQuestion,
  onGenerateMock,
  scoredQuestionIds = new Set(),
  generating = false,
}: QuestionSidebarProps) {
  const [customQuestion, setCustomQuestion] = useState("");
  const [adding, setAdding] = useState(false);

  async function handleAdd() {
    if (!customQuestion.trim()) return;
    setAdding(true);
    try {
      await onAddQuestion(customQuestion.trim());
      setCustomQuestion("");
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
            <p className="py-2 text-xs text-muted">
              Add or generate a question to begin practising.
            </p>
          )}
          {questions.map((q, i) => (
            <button
              key={q.id}
              type="button"
              onClick={() => onSelectQuestion(q.id)}
              className={cn(
                "w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                activeQuestionId === q.id
                  ? "border-brand-200 bg-brand-50 text-brand-800"
                  : "border-transparent hover:bg-gray-50"
              )}
            >
              <span className="text-xs text-muted">Q{i + 1}</span>
              <p className="mt-0.5 line-clamp-2">{q.question_text}</p>
              {scoredQuestionIds.has(q.id) && (
                <span className="mt-1 inline-block text-xs text-brand-600">Scored</span>
              )}
            </button>
          ))}
        </div>

        <div className="space-y-2 border-t border-border pt-3">
          <Button
            size="sm"
            className="w-full"
            onClick={onGenerateMock}
            disabled={generating}
          >
            <Sparkles className="mr-1 h-3 w-3" />
            {generating ? "Generating…" : "Generate mock question"}
          </Button>
          <div className="flex gap-1">
            <input
              type="text"
              value={customQuestion}
              onChange={(e) => setCustomQuestion(e.target.value)}
              placeholder="Type your own question…"
              className="flex-1 rounded-lg border border-border px-2 py-1.5 text-xs"
              onKeyDown={(e) => e.key === "Enter" && void handleAdd()}
            />
            <Button
              size="sm"
              variant="secondary"
              onClick={() => void handleAdd()}
              disabled={adding || !customQuestion.trim()}
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
