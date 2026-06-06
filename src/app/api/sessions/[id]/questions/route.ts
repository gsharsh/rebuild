import { NextResponse } from "next/server";
import { getOrCreateDbUser, unauthorized, notFound } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getOrCreateDbUser();
  if (!user) return unauthorized();

  const { id } = await params;

  const session = await prisma.session.findFirst({
    where: { id, userId: user.id },
  });

  if (!session) return notFound("Session not found");

  const questions = await prisma.question.findMany({
    where: { sessionId: id },
    orderBy: { createdAt: "asc" },
    include: {
      answers: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: { feedback: true },
      },
    },
  });

  return NextResponse.json(questions);
}
