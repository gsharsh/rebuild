import { NextResponse } from "next/server";
import { getOrCreateDbUser, unauthorized, notFound, badRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeFormFile } from "@/lib/storage";
import { transcribeAudio } from "@/lib/elevenlabs";
import { runFullAnalysis } from "@/lib/analysis";

export async function POST(request: Request) {
  const user = await getOrCreateDbUser();
  if (!user) return unauthorized();

  const formData = await request.formData();
  const sessionId = formData.get("sessionId") as string;
  const questionId = formData.get("questionId") as string;
  const audioFile = formData.get("audio") as File | null;
  const durationSeconds = parseFloat(
    (formData.get("durationSeconds") as string) ?? "0"
  );

  if (!sessionId || !questionId || !audioFile) {
    return badRequest("sessionId, questionId, and audio file are required");
  }

  const session = await prisma.session.findFirst({
    where: { id: sessionId, userId: user.id },
  });

  if (!session) return notFound("Session not found");

  const { filePath, size } = await writeFormFile(audioFile, "audio");
  const buffer = Buffer.from(await audioFile.arrayBuffer());
  const transcription = await transcribeAudio(buffer, audioFile.name);

  const answer = await prisma.answer.create({
    data: {
      sessionId,
      questionId,
      userId: user.id,
      answerMode: "audio",
      transcript: transcription.transcript,
      durationSeconds,
      audioPath: filePath,
    },
  });

  await prisma.uploadedFile.create({
    data: {
      answerId: answer.id,
      fileType: "audio",
      filePath,
      originalName: audioFile.name,
      mimeType: audioFile.type || "audio/webm",
      size,
    },
  });

  const analysis = await runFullAnalysis({
    answerId: answer.id,
    sessionId,
    questionId,
    answerText: transcription.transcript,
    answerMode: "audio",
    transcript: transcription.transcript,
  });

  await prisma.session.update({
    where: { id: sessionId },
    data: { updatedAt: new Date() },
  });

  return NextResponse.json(
    { answer, transcription, ...analysis },
    { status: 201 }
  );
}
