import { NextResponse } from "next/server";
import { getOrCreateDbUser, unauthorized, notFound, badRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { runFullAnalysis } from "@/lib/analysis";

export async function POST(request: Request) {
  const user = await getOrCreateDbUser();
  if (!user) return unauthorized();

  const body = await request.json();
  const { sessionId, questionId, originalText } = body;

  if (!sessionId || !questionId || !originalText?.trim()) {
    return badRequest("sessionId, questionId, and originalText are required");
  }

  const session = await prisma.session.findFirst({
    where: { id: sessionId, userId: user.id },
  });

  if (!session) return notFound("Session not found");

  const answer = await prisma.answer.create({
    data: {
      sessionId,
      questionId,
      userId: user.id,
      answerMode: "text",
      originalText: originalText.trim(),
      transcript: originalText.trim(),
    },
  });

  const analysis = await runFullAnalysis({
    answerId: answer.id,
    sessionId,
    questionId,
    answerText: originalText.trim(),
    answerMode: "text",
  });

  await prisma.session.update({
    where: { id: sessionId },
    data: { updatedAt: new Date() },
  });

  return NextResponse.json({ answer, ...analysis }, { status: 201 });
}
