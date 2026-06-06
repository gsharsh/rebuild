import { NextResponse } from "next/server";
import { getOrCreateDbUser, unauthorized } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const user = await getOrCreateDbUser();
  if (!user) return unauthorized();

  const sessions = await prisma.session.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    include: {
      answers: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: { feedback: true },
      },
      _count: { select: { questions: true } },
    },
  });

  const result = sessions.map((s) => ({
    id: s.id,
    interviewType: s.interviewType,
    role: s.role,
    organisation: s.organisation,
    context: s.context,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
    questionCount: s._count.questions,
    latestScore: s.answers[0]?.feedback?.overallScore ?? null,
  }));

  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const user = await getOrCreateDbUser();
  if (!user) return unauthorized();

  const body = await request.json();
  const { interviewType, role, organisation, context } = body;

  if (!interviewType || !role || !organisation) {
    return NextResponse.json(
      { error: "interviewType, role, and organisation are required" },
      { status: 400 }
    );
  }

  const session = await prisma.session.create({
    data: {
      userId: user.id,
      interviewType,
      role,
      organisation,
      context: context ?? "",
    },
  });

  return NextResponse.json(session, { status: 201 });
}
