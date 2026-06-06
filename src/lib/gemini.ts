import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  MOCK_FINAL_FEEDBACK,
  MOCK_GENERATED_QUESTION,
  MOCK_SCRIPT_ANALYSIS,
} from "@/lib/mock-fallbacks";
import type {
  FinalFeedback,
  ScriptAnalysis,
  SpeechAnalysis,
} from "@/lib/types";

const genAI = process.env.GEMINI_API_KEY
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  : null;

async function generateText(prompt: string): Promise<string> {
  if (!genAI) throw new Error("Gemini API key not configured");
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
  const result = await model.generateContent(prompt);
  return result.response.text();
}

function parseJson(text: string): Record<string, unknown> {
  const cleaned = text.replace(/```json\n?|\n?```/g, "").trim();
  return JSON.parse(cleaned) as Record<string, unknown>;
}

export async function generateQuestion(params: {
  interviewType: string;
  role: string;
  organisation: string;
  context: string;
}) {
  try {
    const prompt = `You are an interview coach for students. Generate ONE realistic interview question.

Interview type: ${params.interviewType}
Role: ${params.role}
Organisation: ${params.organisation}
Context: ${params.context}

Return only the question text, no quotes or numbering. Use supportive, professional language.`;

    const text = await generateText(prompt);
    return { questionText: text.trim(), isMock: false };
  } catch {
    return { questionText: MOCK_GENERATED_QUESTION, isMock: true };
  }
}

export async function analyzeScript(params: {
  questionText: string;
  answerText: string;
  interviewType: string;
  role: string;
}) {
  try {
    const prompt = `You are a supportive Script Coach for interview readiness. Analyze this answer.

Question: ${params.questionText}
Answer: ${params.answerText}
Interview type: ${params.interviewType}
Role: ${params.role}

Use supportive language. Never criticize accent or say "bad English". Focus on structure, clarity, listener-friendly phrasing, and interview readiness.

Return JSON only:
{
  "score": number 0-100,
  "strengths": string[],
  "improvements": string[],
  "structureNotes": string,
  "listenerFriendlyPhrases": string[]
}`;

    const text = await generateText(prompt);
    return { ...parseJson(text), isMock: false } as ScriptAnalysis;
  } catch {
    return MOCK_SCRIPT_ANALYSIS;
  }
}

export async function finalJudge(params: {
  questionText: string;
  answerText: string;
  interviewType: string;
  role: string;
  organisation: string;
  speechAnalysis?: SpeechAnalysis | Record<string, unknown> | null;
  postureAnalysis?: Record<string, unknown> | null;
}) {
  try {
    const prompt = `You are a supportive interview coach giving final feedback for interview readiness.

Question: ${params.questionText}
Answer: ${params.answerText}
Interview type: ${params.interviewType}
Role: ${params.role}
Organisation: ${params.organisation}
Speech analysis: ${JSON.stringify(params.speechAnalysis ?? {})}
Posture analysis: ${JSON.stringify(params.postureAnalysis ?? {})}

Use supportive language. Never mention accent fixing, bad English, or failed eye contact. Use terms like clearer delivery, confidence coaching, listener-friendly phrasing, posture signals, camera attention.

Return JSON only:
{
  "overallScore": number,
  "scriptScore": number,
  "speechScore": number,
  "postureScore": number or null,
  "summary": string,
  "improvedAnswer": string,
  "easierToSayVersion": string,
  "sixtySecondVersion": string,
  "teachingNotes": string[],
  "phrasesToPractice": string[]
}`;

    const text = await generateText(prompt);
    return { ...parseJson(text), isMock: false } as FinalFeedback;
  } catch {
    return MOCK_FINAL_FEEDBACK;
  }
}

export async function analyzeSpeech(params: {
  transcript: string;
  durationSeconds?: number;
}) {
  try {
    const prompt = `You are a supportive Speech Coach. Analyze this spoken answer transcript for interview readiness.

Transcript: ${params.transcript}
Duration seconds: ${params.durationSeconds ?? "unknown"}

Focus on pace, clarity, filler words, and confidence coaching. Never criticize accent.

Return JSON only:
{
  "score": number 0-100,
  "pace": string,
  "clarity": string,
  "fillerWords": string[],
  "suggestions": string[]
}`;

    const text = await generateText(prompt);
    return { ...parseJson(text), isMock: false } as SpeechAnalysis;
  } catch {
    return {
      score: 68,
      pace: "steady",
      clarity: "good",
      fillerWords: [],
      suggestions: ["Practice pausing after key points for clearer delivery."],
      isMock: true,
    };
  }
}
