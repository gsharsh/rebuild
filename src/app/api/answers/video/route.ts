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
  const videoFile = formData.get("video") as File | null;
  const transcript = (formData.get("transcript") as string) ?? "";
  const postureAnalysisRaw = formData.get("postureAnalysis") as string | null;

  if (!sessionId || !questionId || !videoFile) {
    return badRequest("sessionId, questionId, and video file are required");
  }

  const session = await prisma.session.findFirst({
    where: { id: sessionId, userId: user.id },
  });

  if (!session) return notFound("Session not found");

  const { filePath, size } = await writeFormFile(videoFile, "video");

  let finalTranscript = transcript;
  if (!finalTranscript) {
    const buffer = Buffer.from(await videoFile.arrayBuffer());
    const transcription = await transcribeAudio(buffer, videoFile.name);
    finalTranscript = transcription.transcript;
  }

  let postureAnalysis = null;
  if (postureAnalysisRaw) {
    try {
      postureAnalysis = JSON.parse(postureAnalysisRaw);
    } catch {
      postureAnalysis = null;
    }
  }

  const answer = await prisma.answer.create({
    data: {
      sessionId,
      questionId,
      userId: user.id,
      answerMode: "video",
      transcript: finalTranscript,
      videoPath: filePath,
      postureAnalysis: postureAnalysis ?? undefined,
    },
  });

  await prisma.uploadedFile.create({
    data: {
      answerId: answer.id,
      fileType: "video",
      filePath,
      originalName: videoFile.name,
      mimeType: videoFile.type || "video/webm",
      size,
    },
  });

  const analysis = await runFullAnalysis({
    answerId: answer.id,
    sessionId,
    questionId,
    answerText: finalTranscript,
    answerMode: "video",
    transcript: finalTranscript,
    postureAnalysis,
  });

  await prisma.session.update({
    where: { id: sessionId },
    data: { updatedAt: new Date() },
  });

  return NextResponse.json({ answer, ...analysis }, { status: 201 });
}
