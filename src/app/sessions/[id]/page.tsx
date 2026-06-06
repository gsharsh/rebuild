"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { QuestionSidebar } from "@/components/session/question-sidebar";
import { PractisePanel } from "@/components/session/practise-panel";
import { ResultsPanel } from "@/components/session/results/results-panel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  createQuestion,
  getQuestionAnswers,
  getSession,
  getSessionQuestions,
} from "@/lib/api-client";
import { DEMO_QUESTION } from "@/lib/demo-data";
import type { AnalyzeResponse, Question, Session } from "@/lib/api-types";
import { getWorkspaceCopy } from "@/lib/workspace-copy";
import { ArrowLeft } from "lucide-react";

export default function SessionWorkspacePage() {
  const params = useParams();
  const sessionId = params.id as string;

  const [session, setSession] = useState<Session | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(null);
  const [scoredIds, setScoredIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeResult, setAnalyzeResult] = useState<AnalyzeResponse | null>(null);
  const [isDemo, setIsDemo] = useState(false);

  const loadWorkspace = useCallback(async () => {
    try {
      const [sess, qs] = await Promise.all([
        getSession(sessionId),
        getSessionQuestions(sessionId),
      ]);
      setSession(sess);
      setQuestions(qs);

      const scored = new Set<string>();
      await Promise.all(
        qs.map(async (q) => {
          try {
            const answers = await getQuestionAnswers(q.id);
            if (answers.length > 0) scored.add(q.id);
          } catch {
            // ignore per-question errors
          }
        })
      );
      setScoredIds(scored);

      setActiveQuestionId((current) => {
        if (current && qs.some((q) => q.id === current)) return current;
        return qs.length > 0 ? qs[qs.length - 1].id : null;
      });
    } catch {
      setSession(null);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    void loadWorkspace();
  }, [loadWorkspace]);

  const activeQuestion = useMemo(
    () => questions.find((q) => q.id === activeQuestionId) ?? null,
    [questions, activeQuestionId]
  );
  const workspaceCopy = session
    ? getWorkspaceCopy(session.interview_type)
    : getWorkspaceCopy("");

  useEffect(() => {
    if (!activeQuestionId) {
      setAnalyzeResult(null);
      return;
    }

    async function loadAnswer() {
      try {
        const answers = await getQuestionAnswers(activeQuestionId!);
        const latest = answers[answers.length - 1];
        if (latest?.script_analysis && latest.transcript) {
          setAnalyzeResult({
            answer_id: latest.id,
            transcript: latest.transcript,
            speech_analysis: latest.speech_analysis as AnalyzeResponse["speech_analysis"],
            script_analysis: latest.script_analysis as AnalyzeResponse["script_analysis"],
            coach_audio_url: latest.audio_url,
            coach_audio_error:
              (latest.speech_analysis as AnalyzeResponse["speech_analysis"])
                ?.coach_audio_error ?? null,
            recording_url: latest.video_url,
          });
          setIsDemo(false);
        } else {
          setAnalyzeResult(null);
        }
      } catch {
        setAnalyzeResult(null);
      }
    }

    void loadAnswer();
  }, [activeQuestionId]);

  async function handleAddQuestion(text: string) {
    const q = await createQuestion({
      session_id: sessionId,
      question_text: text,
      source: "user",
    });
    setQuestions((prev) => [...prev, q]);
    setActiveQuestionId(q.id);
    setAnalyzeResult(null);
  }

  async function handleGenerateMock() {
    setGenerating(true);
    try {
      const prompt = session
        ? workspaceCopy.defaultPrompt(session)
        : DEMO_QUESTION;
      const q = await createQuestion({
        session_id: sessionId,
        question_text: prompt,
        source: workspaceCopy.isPresentationLike ? "script_prompt" : "mock",
      });
      setQuestions((prev) => [...prev, q]);
      setActiveQuestionId(q.id);
      setAnalyzeResult(null);
    } catch {
      const fallback: Question = {
        id: `demo-q-${Date.now()}`,
        session_id: sessionId,
        question_text: session
          ? workspaceCopy.defaultPrompt(session)
          : DEMO_QUESTION,
        source: workspaceCopy.isPresentationLike ? "script_prompt" : "mock",
        created_at: new Date().toISOString(),
      };
      setQuestions((prev) => [...prev, fallback]);
      setActiveQuestionId(fallback.id);
    } finally {
      setGenerating(false);
    }
  }

  function handleAnalyzeComplete(result: AnalyzeResponse, demo = false) {
    setAnalyzing(false);
    setAnalyzeResult(result);
    setIsDemo(demo);
    if (activeQuestionId) {
      setScoredIds((prev) => new Set(prev).add(activeQuestionId));
    }
    void loadWorkspace();
  }

  const showResults = analyzeResult !== null;

  if (loading) {
    return (
      <div className="min-h-screen bg-surface">
        <DashboardHeader />
        <main className="mx-auto max-w-7xl px-4 py-8">
          <p className="text-sm text-muted">Loading session…</p>
        </main>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-surface">
        <DashboardHeader />
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
    <div className="flex min-h-screen flex-col bg-surface">
      <DashboardHeader />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-4 sm:px-6">
        <div className="mb-4">
          <Link
            href="/dashboard"
            className="inline-flex items-center text-sm text-muted hover:text-gray-900"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Your Sessions
          </Link>
          <div className="mt-2 flex items-center gap-2">
            <h1 className="text-xl font-bold text-gray-900">{session.role}</h1>
            <Badge variant="info">{session.interview_type}</Badge>
          </div>
          <p className="text-sm text-muted">{session.organisation}</p>
        </div>

        <div className="grid min-h-[calc(100vh-180px)] grid-cols-1 gap-4 lg:grid-cols-12">
          <div className="lg:col-span-3">
            <QuestionSidebar
              title={workspaceCopy.sidebarTitle}
              emptyText={workspaceCopy.emptyText}
              generateLabel={workspaceCopy.generateLabel}
              generatingLabel={workspaceCopy.generatingLabel}
              addPlaceholder={workspaceCopy.addPlaceholder}
              itemPrefix={workspaceCopy.itemPrefix}
              questions={questions}
              activeQuestionId={activeQuestionId}
              onSelectQuestion={setActiveQuestionId}
              onAddQuestion={handleAddQuestion}
              onGenerateMock={handleGenerateMock}
              scoredQuestionIds={scoredIds}
              generating={generating}
            />
          </div>

          <div className="lg:col-span-9">
            {activeQuestion ? (
              showResults ? (
                <ResultsPanel
                  result={analyzeResult}
                  isDemo={isDemo}
                  loading={analyzing}
                />
              ) : (
                <PractisePanel
                  sessionId={sessionId}
                  questionId={activeQuestion.id}
                  questionText={activeQuestion.question_text}
                  title={workspaceCopy.practiseTitle}
                  textPlaceholder={workspaceCopy.practiseTextPlaceholder}
                  audioHelp={workspaceCopy.audioHelp}
                  onAnalyzeStart={() => setAnalyzing(true)}
                  onAnalyzeComplete={handleAnalyzeComplete}
                />
              )
            ) : (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-white py-16 text-center">
                <p className="mb-4 text-sm text-muted">
                  {workspaceCopy.emptyText}
                </p>
                <Button onClick={() => void handleGenerateMock()} disabled={generating}>
                  {workspaceCopy.generateLabel}
                </Button>
              </div>
            )}

            {showResults && activeQuestion && (
              <div className="mt-4 flex justify-end">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setAnalyzeResult(null)}
                >
                  Practise again
                </Button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
