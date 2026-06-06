"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn, formatScore } from "@/lib/utils";

type CoachTab = "script" | "speech" | "bilingual" | "posture" | "overall";

interface CoachResultsProps {
  scriptAnalysis?: Record<string, unknown> | null;
  speechAnalysis?: Record<string, unknown> | null;
  finalFeedback?: Record<string, unknown> | null;
  postureAnalysis?: Record<string, unknown> | null;
  translatedText?: string | null;
  originalText?: string | null;
  nativeLanguage?: string | null;
  loading?: boolean;
}

export function CoachResults({
  scriptAnalysis,
  speechAnalysis,
  finalFeedback,
  postureAnalysis,
  translatedText,
  originalText,
  nativeLanguage,
  loading,
}: CoachResultsProps) {
  const [tab, setTab] = useState<CoachTab>("overall");

  const tabs: { id: CoachTab; label: string; show: boolean }[] = [
    { id: "overall", label: "Overall", show: true },
    { id: "script", label: "Script Coach", show: !!scriptAnalysis },
    { id: "speech", label: "Speech Coach", show: !!speechAnalysis },
    {
      id: "bilingual",
      label: "Bilingual Prep",
      show: !!(translatedText || originalText),
    },
    { id: "posture", label: "Posture Coach", show: !!postureAnalysis },
  ];

  if (loading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <h3 className="font-semibold">Coach Results</h3>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12 text-muted text-sm">
            Analyzing your answer…
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!finalFeedback && !scriptAnalysis) {
    return (
      <Card className="h-full">
        <CardHeader>
          <h3 className="font-semibold">Coach Results</h3>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted py-8 text-center">
            Submit an answer to receive supportive coaching feedback.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Coach Results</h3>
          {finalFeedback?.overallScore != null && (
            <Badge variant="info">
              {formatScore(finalFeedback.overallScore as number)}
            </Badge>
          )}
        </div>
        <div className="flex flex-wrap gap-1 mt-3">
          {tabs
            .filter((t) => t.show)
            .map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "px-3 py-1 rounded-md text-xs font-medium transition-colors",
                  tab === t.id
                    ? "bg-brand-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                )}
              >
                {t.label}
              </button>
            ))}
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto max-h-[600px]">
        {tab === "overall" && finalFeedback && (
          <OverallTab feedback={finalFeedback} />
        )}
        {tab === "script" && scriptAnalysis && (
          <ScriptTab analysis={scriptAnalysis} />
        )}
        {tab === "speech" && speechAnalysis && (
          <SpeechTab analysis={speechAnalysis} />
        )}
        {tab === "bilingual" && (
          <BilingualTab
            originalText={originalText}
            translatedText={translatedText}
            nativeLanguage={nativeLanguage}
            easierToSay={finalFeedback?.easierToSayVersion as string}
          />
        )}
        {tab === "posture" && postureAnalysis && (
          <PostureTab analysis={postureAnalysis} />
        )}
      </CardContent>
    </Card>
  );
}

function OverallTab({ feedback }: { feedback: Record<string, unknown> }) {
  return (
    <div className="space-y-4 text-sm">
      <ScoreRow label="Overall" score={feedback.overallScore as number} />
      <ScoreRow label="Script" score={feedback.scriptScore as number} />
      {feedback.speechScore != null && (
        <ScoreRow label="Speech" score={feedback.speechScore as number} />
      )}
      {feedback.postureScore != null && (
        <ScoreRow label="Posture" score={feedback.postureScore as number} />
      )}
      <Section title="Summary">{feedback.summary as string}</Section>
      <Section title="Improved Answer">
        {feedback.improvedAnswer as string}
      </Section>
      <Section title="60-Second Version">
        {feedback.sixtySecondVersion as string}
      </Section>
      {Array.isArray(feedback.teachingNotes) && (
        <ListSection title="Teaching Notes" items={feedback.teachingNotes as string[]} />
      )}
      {Array.isArray(feedback.phrasesToPractice) && (
        <ListSection
          title="Phrases to Practice"
          items={feedback.phrasesToPractice as string[]}
        />
      )}
      {(feedback as { isMock?: boolean }).isMock && (
        <p className="text-xs text-amber-600 bg-amber-50 rounded p-2">
          Demo mode: showing sample coaching feedback.
        </p>
      )}
    </div>
  );
}

function ScriptTab({ analysis }: { analysis: Record<string, unknown> }) {
  return (
    <div className="space-y-4 text-sm">
      <ScoreRow label="Script Score" score={analysis.score as number} />
      {Array.isArray(analysis.strengths) && (
        <ListSection title="Strengths" items={analysis.strengths as string[]} />
      )}
      {Array.isArray(analysis.improvements) && (
        <ListSection
          title="Script Improvements"
          items={analysis.improvements as string[]}
        />
      )}
      <Section title="Structure Notes">{analysis.structureNotes as string}</Section>
      {Array.isArray(analysis.listenerFriendlyPhrases) && (
        <ListSection
          title="Listener-Friendly Phrases"
          items={analysis.listenerFriendlyPhrases as string[]}
        />
      )}
    </div>
  );
}

function SpeechTab({ analysis }: { analysis: Record<string, unknown> }) {
  return (
    <div className="space-y-4 text-sm">
      <ScoreRow label="Speech Score" score={analysis.score as number} />
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs text-muted">Pace</p>
          <p className="font-medium capitalize">{analysis.pace as string}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <p className="text-xs text-muted">Clarity</p>
          <p className="font-medium capitalize">{analysis.clarity as string}</p>
        </div>
      </div>
      {Array.isArray(analysis.fillerWords) &&
        (analysis.fillerWords as string[]).length > 0 && (
          <Section title="Filler Words">
            {(analysis.fillerWords as string[]).join(", ")}
          </Section>
        )}
      {Array.isArray(analysis.suggestions) && (
        <ListSection
          title="Confidence Coaching"
          items={analysis.suggestions as string[]}
        />
      )}
    </div>
  );
}

function BilingualTab({
  originalText,
  translatedText,
  nativeLanguage,
  easierToSay,
}: {
  originalText?: string | null;
  translatedText?: string | null;
  nativeLanguage?: string | null;
  easierToSay?: string;
}) {
  return (
    <div className="space-y-4 text-sm">
      {nativeLanguage && (
        <p className="text-muted text-xs">Language: {nativeLanguage}</p>
      )}
      {originalText && (
        <Section title="Your Original Answer">{originalText}</Section>
      )}
      {translatedText && (
        <Section title="English Translation">{translatedText}</Section>
      )}
      {easierToSay && (
        <Section title="Easier-to-Say Version">{easierToSay}</Section>
      )}
    </div>
  );
}

function PostureTab({ analysis }: { analysis: Record<string, unknown> }) {
  return (
    <div className="space-y-4 text-sm">
      {analysis.score != null && (
        <ScoreRow label="Posture Score" score={analysis.score as number} />
      )}
      {Array.isArray(analysis.signals) && (
        <ListSection title="Posture Signals" items={analysis.signals as string[]} />
      )}
      {Array.isArray(analysis.suggestions) && (
        <ListSection
          title="Camera & Presence Tips"
          items={analysis.suggestions as string[]}
        />
      )}
      {typeof analysis.summary === "string" && (
        <Section title="Summary">{analysis.summary}</Section>
      )}
    </div>
  );
}

function ScoreRow({ label, score }: { label: string; score?: number }) {
  if (score == null) return null;
  return (
    <div className="flex items-center justify-between bg-brand-50 rounded-lg px-3 py-2">
      <span className="text-muted">{label}</span>
      <span className="font-semibold text-brand-700">{formatScore(score)}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="font-medium text-gray-900 mb-1">{title}</h4>
      <p className="text-gray-600 leading-relaxed">{children}</p>
    </div>
  );
}

function ListSection({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h4 className="font-medium text-gray-900 mb-1">{title}</h4>
      <ul className="list-disc list-inside space-y-1 text-gray-600">
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
