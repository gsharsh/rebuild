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
  onDeleteQuestion?: (id: string) => Promise<void>;
  onGenerateMock: () => Promise<void>;
  scoredQuestionIds?: Set<string>;
  generating?: boolean;
  inputFirst?: boolean;
}

function cleanTitle(line: string) {
  return line
    .replace(/^#+\s*/, "")
    .replace(/^\*\*|\*\*$/g, "")
    .replace(/^title:\s*/i, "")
    .trim();
}

function displayQuestion(q: Question, fallbackLabel: string) {
  const lines = q.question_text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const firstLine = cleanTitle(lines[0] ?? "");
  const rest = lines.slice(1).join(" ");

  if (q.source === "generated_section" && firstLine) {
    return {
      label: firstLine,
      body: rest || q.question_text,
    };
  }

  if (/^practi[cs]e the full/i.test(firstLine)) {
    return {
      label: "Full presentation",
      body: q.question_text,
    };
  }

  if (firstLine && firstLine.length <= 52 && lines.length > 1) {
    return {
      label: firstLine,
      body: rest,
    };
  }

  return {
    label: fallbackLabel,
    body: q.question_text,
  };
}

export function QuestionSidebar({
  title = "Questions",
  emptyText = "Add or generate a question to begin practising.",
  generateLabel = "Generate mock question",
  generatingLabel = "Generating...",
  addPlaceholder = "Type your own question...",
  itemPrefix = "Q",
  questions,
  activeQuestionId,
  onSelectQuestion,
  onAddQuestion,
  onDeleteQuestion,
  onGenerateMock,
  scoredQuestionIds = new Set(),
  generating = false,
  inputFirst = false,
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
    <Card className="flex h-full min-h-0 flex-col overflow-hidden">
      <CardHeader className="shrink-0 px-4 py-3">
        <h3 className="text-sm font-semibold">{title}</h3>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden px-4 py-3">
        <div className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
          {questions.length === 0 && (
            <p className="py-2 text-xs text-muted">
              {emptyText}
            </p>
          )}
          {questions.map((q, i) => {
            const fallbackLabel = `${itemPrefix}${i + 1}`;
            const display = displayQuestion(q, fallbackLabel);
            return (
              <div
                key={q.id}
                className={cn(
                  "group relative rounded-lg border transition-colors",
                  activeQuestionId === q.id
                    ? "border-brand-200 bg-brand-50 text-brand-800"
                    : "border-transparent hover:bg-gray-50"
                )}
              >
                <button
                  type="button"
                  onClick={() => onSelectQuestion(q.id)}
                  className="w-full px-3 py-2 pr-9 text-left text-sm"
                >
                  <span className="line-clamp-1 text-xs font-medium text-muted">
                    {display.label}
                  </span>
                  <p className="mt-0.5 line-clamp-2 text-sm leading-5 text-gray-800">
                    {display.body}
                  </p>
                  {scoredQuestionIds.has(q.id) && (
                    <span className="mt-1 inline-block text-xs text-brand-600">Scored</span>
                  )}
                </button>
                {onDeleteQuestion && (
                  <button
                    type="button"
                    aria-label={`Delete ${display.label}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      void onDeleteQuestion(q.id);
                    }}
                    className="absolute right-2 top-2 rounded-md p-1.5 text-gray-400 opacity-0 transition hover:bg-red-50 hover:text-red-600 focus:opacity-100 group-hover:opacity-100"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <div className="shrink-0 space-y-2 border-t border-border bg-white pt-3">
          {inputFirst && (
            <QuestionInput
              value={customQuestion}
              onChange={setCustomQuestion}
              placeholder={addPlaceholder}
              onSubmit={handleAdd}
              disabled={adding || !customQuestion.trim()}
            />
          )}
          <Button
            size="sm"
            className="w-full"
            onClick={onGenerateMock}
            disabled={generating}
          >
            <Sparkles className="mr-1 h-3 w-3" />
            {generating ? generatingLabel : generateLabel}
          </Button>
          {!inputFirst && (
            <QuestionInput
              value={customQuestion}
              onChange={setCustomQuestion}
              placeholder={addPlaceholder}
              onSubmit={handleAdd}
              disabled={adding || !customQuestion.trim()}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function QuestionInput({
  value,
  onChange,
  placeholder,
  onSubmit,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  onSubmit: () => Promise<void>;
  disabled: boolean;
}) {
  return (
    <div className="flex gap-1">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1 rounded-lg border border-border px-2 py-1.5 text-xs"
        onKeyDown={(e) => e.key === "Enter" && void onSubmit()}
      />
      <Button
        size="sm"
        variant="secondary"
        onClick={() => void onSubmit()}
        disabled={disabled}
      >
        <Plus className="h-3 w-3" />
      </Button>
    </div>
  );
}
