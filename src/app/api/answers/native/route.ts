import { NextResponse } from "next/server";
import { getOrCreateDbUser, unauthorized, notFound, badRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { translateText } from "@/lib/elevenlabs";
import { runFullAnalysis } from "@/lib/analysis";

export async function POST(request: Request) {
  const user = await getOrCreateDbUser();
  if (!user) return unauthorized();

  const body = await request.json();
  const { sessionId, questionId, originalText, nativeLanguage } = body;

  if (!sessionId || !questionId || !originalText?.trim() || !nativeLanguage) {
    return badRequest(
      "sessionId, questionId, originalText, and nativeLanguage are required"
    );
  }

  const session = await prisma.session.findFirst({
    where: { id: sessionId, userId: user.id },
  });

  if (!session) return notFound("Session not found");

  const translation = await translateText(
    originalText.trim(),
    nativeLanguage
  );

  const answer = await prisma.answer.create({
    data: {
      sessionId,
      questionId,
      userId: user.id,
      answerMode: "native",
      originalText: originalText.trim(),
      nativeLanguage,
      translatedText: translation.translatedText,
      transcript: translation.translatedText,
    },
  });

  const analysis = await runFullAnalysis({
    answerId: answer.id,
    sessionId,
    questionId,
    answerText: translation.translatedText,
    answerMode: "native",
    transcript: translation.translatedText,
  });

  await prisma.session.update({
    where: { id: sessionId },
    data: { updatedAt: new Date() },
  });

  return NextResponse.json(
    { answer, translation, ...analysis },
    { status: 201 }
  );
}
