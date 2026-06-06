import { NextResponse } from "next/server";
import { getOrCreateDbUser, unauthorized, notFound } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const user = await getOrCreateDbUser();
  if (!user) return unauthorized();

  const body = await request.json();
  const { sessionId, questionText } = body;

  if (!sessionId || !questionText) {
    return NextResponse.json(
      { error: "sessionId and questionText are required" },
      { status: 400 }
    );
  }

  const session = await prisma.session.findFirst({
    where: { id: sessionId, userId: user.id },
  });

  if (!session) return notFound("Session not found");

  const question = await prisma.question.create({
    data: {
      sessionId,
      questionText,
      source: "user_provided",
    },
  });

  await prisma.session.update({
    where: { id: sessionId },
    data: { updatedAt: new Date() },
  });

  return NextResponse.json(question, { status: 201 });
}
