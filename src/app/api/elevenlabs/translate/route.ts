import { NextResponse } from "next/server";
import { getOrCreateDbUser, unauthorized, badRequest } from "@/lib/auth";
import { translateText } from "@/lib/elevenlabs";

export async function POST(request: Request) {
  const user = await getOrCreateDbUser();
  if (!user) return unauthorized();

  const body = await request.json();
  const { text, sourceLanguage } = body;

  if (!text || !sourceLanguage) {
    return badRequest("text and sourceLanguage are required");
  }

  const result = await translateText(text, sourceLanguage);
  return NextResponse.json(result);
}
