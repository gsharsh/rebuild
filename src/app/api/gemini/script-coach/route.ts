import { NextResponse } from "next/server";
import { getOrCreateDbUser, unauthorized, badRequest } from "@/lib/auth";
import { analyzeScript } from "@/lib/gemini";

export async function POST(request: Request) {
  const user = await getOrCreateDbUser();
  if (!user) return unauthorized();

  const body = await request.json();
  const { questionText, answerText, interviewType, role } = body;

  if (!questionText || !answerText) {
    return badRequest("questionText and answerText are required");
  }

  const result = await analyzeScript({
    questionText,
    answerText,
    interviewType: interviewType ?? "job interview",
    role: role ?? "candidate",
  });

  return NextResponse.json(result);
}
