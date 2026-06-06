"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AnswerInput } from "@/components/session/answer-input";
import { CoachResults } from "@/components/session/coach-results";
import { ArrowLeft, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface Question {
  id: string;
  questionText: string;
  source: string;
  answers: Array<{
    id: string;
    answerMode: string;
    originalText?: string | null;
    translatedText?: string | null;
    nativeLanguage?: string | null;
    scriptAnalysis?: Record<string, unknown> | null;
    speechAnalysis?: Record<string, unknown> | null;
    postureAnalysis?: Record<string, unknown> | null;
    finalFeedback?: Record<string, unknown> | null;
    feedback?: Record<string, unknown> | null;
  }>;
}

interface Session {
  id: string;
  interviewType: string;
  role: string;
  organisation: string;
  context: string;
  questions: Question[];
}

export default function SessionWorkspacePage() {
  const params = useParams();
  const sessionId = params.id as string;

  const [session, setSession] = useState<Session | null>(null);
  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(null);
  const [customQuestion, setCustomQuestion] = useState("");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [coachData, setCoachData] = useState<Record<string, unknown> | null>(
    null
  );

  const loadSession = useCallback(async () => {
    const res = await fetch(`/api/sessions/${sessionId}`);
    if (res.ok) {
      const data: Session = await res.json();
      setSession(data);
      setActiveQuestionId((current) => {
        if (current) return current;
        if (data.questions.length > 0) {
          return data.questions[data.questions.length - 1].id;
        }
        return null;
      });
    }
    setLoading(false);
  }, [sessionId]);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  const activeQuestion = session?.questions.find(
    (q) => q.id === activeQuestionId
  );

  useEffect(() => {
    if (activeQuestion?.answers[0]) {
      const answer = activeQuestion.answers[0];
      setCoachData({
        scriptAnalysis: answer.scriptAnalysis,
        speechAnalysis: answer.speechAnalysis,
        finalFeedback: answer.finalFeedback ?? answer.feedback,
        postureAnalysis: answer.postureAnalysis,
        translatedText: answer.translatedText,
        originalText: answer.originalText,
        nativeLanguage: answer.nativeLanguage,
      });
    } else {
      setCoachData(null);
    }
  }, [activeQuestion]);

  async function generateQuestion() {
    setGenerating(true);
    try {
      const res = await fetch("/api/questions/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      if (res.ok) {
        const q = await res.json();
        setActiveQuestionId(q.id);
        await loadSession();
      }
    } finally {
      setGenerating(false);
    }
  }

  async function addCustomQuestion() {
    if (!customQuestion.trim()) return;
    const res = await fetch("/api/questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId,
        questionText: customQuestion.trim(),
      }),
    });
    if (res.ok) {
      const q = await res.json();
      setCustomQuestion("");
      setActiveQuestionId(q.id);
      await loadSession();
    }
  }

  function handleSubmitComplete(result: Record<string, unknown>) {
    setAnalyzing(false);
    setCoachData({
      scriptAnalysis: result.scriptAnalysis as Record<string, unknown>,
      speechAnalysis: result.speechAnalysis as Record<string, unknown>,
      finalFeedback: (result.finalFeedback ?? result.feedback) as Record<
        string,
        unknown
      >,
      postureAnalysis: (result.answer as Record<string, unknown>)
        ?.postureAnalysis as Record<string, unknown>,
      translatedText: (result.answer as Record<string, unknown>)
        ?.translatedText as string,
      originalText: (result.answer as Record<string, unknown>)
        ?.originalText as string,
      nativeLanguage: (result.answer as Record<string, unknown>)
        ?.nativeLanguage as string,
    });
    loadSession();
  }

  if (loading) {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="mx-auto max-w-7xl px-4 py-8">
          <p className="text-muted text-sm">Loading session…</p>
        </main>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="mx-auto max-w-7xl px-4 py-8">
          <p className="text-muted">Session not found.</p>
          <Link href="/dashboard">
            <Button variant="secondary" className="mt-4">
              Back to dashboard
            </Button>
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-4">
        <div className="mb-4">
          <Link
            href="/dashboard"
            className="inline-flex items-center text-sm text-muted hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Dashboard
          </Link>
          <div className="flex items-center gap-2 mt-2">
            <h1 className="text-xl font-bold text-gray-900">{session.role}</h1>
            <Badge variant="info">{session.interviewType}</Badge>
          </div>
          <p className="text-sm text-muted">{session.organisation}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-[calc(100vh-180px)]">
          {/* Left sidebar — questions */}
          <div className="lg:col-span-3">
            <Card className="h-full">
              <CardHeader>
                <h3 className="font-semibold text-sm">Questions</h3>
              </CardHeader>
              <CardContent className="space-y-2">
                {session.questions.length === 0 && (
                  <p className="text-xs text-muted py-2">
                    Generate or add a question to begin.
                  </p>
                )}
                {session.questions.map((q, i) => (
                  <button
                    key={q.id}
                    onClick={() => setActiveQuestionId(q.id)}
                    className={cn(
                      "w-full text-left rounded-lg px-3 py-2 text-sm transition-colors",
                      activeQuestionId === q.id
                        ? "bg-brand-50 border border-brand-200 text-brand-800"
                        : "hover:bg-gray-50 border border-transparent"
                    )}
                  >
                    <span className="text-xs text-muted">Q{i + 1}</span>
                    <p className="line-clamp-2 mt-0.5">{q.questionText}</p>
                    {q.answers[0]?.finalFeedback && (
                      <span className="text-xs text-brand-600 mt-1 inline-block">
                        Scored
                      </span>
                    )}
                  </button>
                ))}

                <div className="pt-3 space-y-2 border-t border-border">
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={generateQuestion}
                    disabled={generating}
                  >
                    <Sparkles className="h-3 w-3 mr-1" />
                    {generating ? "Generating…" : "Generate Question"}
                  </Button>
                  <div className="flex gap-1">
                    <input
                      type="text"
                      value={customQuestion}
                      onChange={(e) => setCustomQuestion(e.target.value)}
                      placeholder="Type your own question…"
                      className="flex-1 rounded-lg border border-border px-2 py-1.5 text-xs"
                      onKeyDown={(e) => e.key === "Enter" && addCustomQuestion()}
                    />
                    <Button size="sm" variant="secondary" onClick={addCustomQuestion}>
                      Add
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Centre — question & answer */}
          <div className="lg:col-span-5">
            <Card className="h-full">
              <CardHeader>
                <h3 className="font-semibold">Current Question</h3>
              </CardHeader>
              <CardContent>
                {activeQuestion ? (
                  <div className="space-y-6">
                    <p className="text-gray-900 leading-relaxed">
                      {activeQuestion.questionText}
                    </p>
                    <div className="border-t border-border pt-4">
                      <h4 className="font-medium text-sm mb-3">Your Answer</h4>
                      <AnswerInput
                        sessionId={sessionId}
                        questionId={activeQuestion.id}
                        onSubmitStart={() => setAnalyzing(true)}
                        onSubmitComplete={handleSubmitComplete}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-muted text-sm mb-4">
                      Generate or add a question to start practising.
                    </p>
                    <Button onClick={generateQuestion} disabled={generating}>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generate First Question
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right — coach results */}
          <div className="lg:col-span-4">
            <CoachResults
              scriptAnalysis={
                coachData?.scriptAnalysis as Record<string, unknown> | null
              }
              speechAnalysis={
                coachData?.speechAnalysis as Record<string, unknown> | null
              }
              finalFeedback={
                coachData?.finalFeedback as Record<string, unknown> | null
              }
              postureAnalysis={
                coachData?.postureAnalysis as Record<string, unknown> | null
              }
              translatedText={coachData?.translatedText as string | null}
              originalText={coachData?.originalText as string | null}
              nativeLanguage={coachData?.nativeLanguage as string | null}
              loading={analyzing}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
