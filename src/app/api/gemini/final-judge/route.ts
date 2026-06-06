import { NextResponse } from "next/server";
import { getOrCreateDbUser, unauthorized, badRequest } from "@/lib/auth";
import { finalJudge } from "@/lib/gemini";

export async function POST(request: Request) {
  const user = await getOrCreateDbUser();
  if (!user) return unauthorized();

  const body = await request.json();
  const {
    questionText,
    answerText,
    interviewType,
    role,
    organisation,
    speechAnalysis,
    postureAnalysis,
  } = body;

  if (!questionText || !answerText) {
    return badRequest("questionText and answerText are required");
  }

  const result = await finalJudge({
    questionText,
    answerText,
    interviewType: interviewType ?? "job interview",
    role: role ?? "candidate",
    organisation: organisation ?? "",
    speechAnalysis,
    postureAnalysis,
  });

  return NextResponse.json(result);
}
