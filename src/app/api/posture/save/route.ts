import { NextResponse } from "next/server";
import { getOrCreateDbUser, unauthorized, badRequest, notFound } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const user = await getOrCreateDbUser();
  if (!user) return unauthorized();

  const body = await request.json();
  const { answerId, postureAnalysis } = body;

  if (!answerId || !postureAnalysis) {
    return badRequest("answerId and postureAnalysis are required");
  }

  const answer = await prisma.answer.findFirst({
    where: { id: answerId, userId: user.id },
  });

  if (!answer) return notFound("Answer not found");

  const updated = await prisma.answer.update({
    where: { id: answerId },
    data: { postureAnalysis },
  });

  return NextResponse.json(updated);
}
