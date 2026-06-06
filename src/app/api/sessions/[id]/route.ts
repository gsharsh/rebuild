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
    include: {
      questions: {
        orderBy: { createdAt: "asc" },
        include: {
          answers: {
            orderBy: { createdAt: "desc" },
            include: { feedback: true, uploadedFiles: true },
          },
        },
      },
    },
  });

  if (!session) return notFound("Session not found");

  return NextResponse.json(session);
}
