import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { analyzeScript, analyzeSpeech, finalJudge } from "@/lib/gemini";
import { textToSpeech } from "@/lib/elevenlabs";

function toJson<T>(value: T): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export async function runFullAnalysis(params: {
  answerId: string;
  sessionId: string;
  questionId: string;
  answerText: string;
  answerMode: string;
  transcript?: string | null;
  postureAnalysis?: Record<string, unknown> | null;
}) {
  const session = await prisma.session.findUnique({
    where: { id: params.sessionId },
    include: { questions: { where: { id: params.questionId } } },
  });

  if (!session || session.questions.length === 0) {
    throw new Error("Session or question not found");
  }

  const question = session.questions[0];
  const textForAnalysis = params.transcript ?? params.answerText;

  const scriptAnalysis = await analyzeScript({
    questionText: question.questionText,
    answerText: textForAnalysis,
    interviewType: session.interviewType,
    role: session.role,
  });

  let speechAnalysis = null;
  if (params.answerMode === "audio" || params.answerMode === "video") {
    speechAnalysis = await analyzeSpeech({
      transcript: textForAnalysis,
    });
  }

  const finalFeedback = await finalJudge({
    questionText: question.questionText,
    answerText: textForAnalysis,
    interviewType: session.interviewType,
    role: session.role,
    organisation: session.organisation,
    speechAnalysis,
    postureAnalysis: params.postureAnalysis,
  });

  const tts = await textToSpeech(
    finalFeedback.easierToSayVersion ?? finalFeedback.summary,
    params.answerId
  );

  await prisma.answer.update({
    where: { id: params.answerId },
    data: {
      scriptAnalysis: toJson(scriptAnalysis),
      speechAnalysis: speechAnalysis ? toJson(speechAnalysis) : undefined,
      finalFeedback: toJson(finalFeedback),
    },
  });

  await prisma.feedback.upsert({
    where: { answerId: params.answerId },
    create: {
      answerId: params.answerId,
      scriptScore: finalFeedback.scriptScore,
      speechScore: finalFeedback.speechScore ?? null,
      postureScore: finalFeedback.postureScore ?? null,
      overallScore: finalFeedback.overallScore,
      summary: finalFeedback.summary,
      improvedAnswer: finalFeedback.improvedAnswer,
      easierToSayVersion: finalFeedback.easierToSayVersion,
      sixtySecondVersion: finalFeedback.sixtySecondVersion,
      teachingNotes: toJson(finalFeedback.teachingNotes),
      phrasesToPractice: toJson(finalFeedback.phrasesToPractice),
      audioFeedbackPath: tts.audioPath,
    },
    update: {
      scriptScore: finalFeedback.scriptScore,
      speechScore: finalFeedback.speechScore ?? null,
      postureScore: finalFeedback.postureScore ?? null,
      overallScore: finalFeedback.overallScore,
      summary: finalFeedback.summary,
      improvedAnswer: finalFeedback.improvedAnswer,
      easierToSayVersion: finalFeedback.easierToSayVersion,
      sixtySecondVersion: finalFeedback.sixtySecondVersion,
      teachingNotes: toJson(finalFeedback.teachingNotes),
      phrasesToPractice: toJson(finalFeedback.phrasesToPractice),
      audioFeedbackPath: tts.audioPath,
    },
  });

  return {
    scriptAnalysis,
    speechAnalysis,
    finalFeedback,
    feedback: {
      scriptScore: finalFeedback.scriptScore,
      speechScore: finalFeedback.speechScore,
      postureScore: finalFeedback.postureScore,
      overallScore: finalFeedback.overallScore,
      summary: finalFeedback.summary,
      improvedAnswer: finalFeedback.improvedAnswer,
      easierToSayVersion: finalFeedback.easierToSayVersion,
      sixtySecondVersion: finalFeedback.sixtySecondVersion,
      teachingNotes: toJson(finalFeedback.teachingNotes),
      phrasesToPractice: toJson(finalFeedback.phrasesToPractice),
      audioFeedbackPath: tts.audioPath,
    },
  };
}
