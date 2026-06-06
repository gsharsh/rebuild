import { NextResponse } from "next/server";
import { getOrCreateDbUser, unauthorized, notFound } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateQuestion } from "@/lib/gemini";

export async function POST(request: Request) {
  const user = await getOrCreateDbUser();
  if (!user) return unauthorized();

  const body = await request.json();
  const { sessionId } = body;

  if (!sessionId) {
    return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
  }

  const session = await prisma.session.findFirst({
    where: { id: sessionId, userId: user.id },
  });

  if (!session) return notFound("Session not found");

  const generated = await generateQuestion({
    interviewType: session.interviewType,
    role: session.role,
    organisation: session.organisation,
    context: session.context,
  });

  const question = await prisma.question.create({
    data: {
      sessionId,
      questionText: generated.questionText,
      source: "generated",
    },
  });

  await prisma.session.update({
    where: { id: sessionId },
    data: { updatedAt: new Date() },
  });

  return NextResponse.json({ ...question, isMock: generated.isMock }, { status: 201 });
}
