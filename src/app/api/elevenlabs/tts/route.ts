import { NextResponse } from "next/server";
import { getOrCreateDbUser, unauthorized, badRequest } from "@/lib/auth";
import { textToSpeech } from "@/lib/elevenlabs";
import { v4 as uuidv4 } from "uuid";

export async function POST(request: Request) {
  const user = await getOrCreateDbUser();
  if (!user) return unauthorized();

  const body = await request.json();
  const { text } = body;

  if (!text) return badRequest("text is required");

  const result = await textToSpeech(text, uuidv4());
  return NextResponse.json(result);
}
