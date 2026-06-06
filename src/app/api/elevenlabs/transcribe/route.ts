import { NextResponse } from "next/server";
import { getOrCreateDbUser, unauthorized, badRequest } from "@/lib/auth";
import { transcribeAudio } from "@/lib/elevenlabs";

export async function POST(request: Request) {
  const user = await getOrCreateDbUser();
  if (!user) return unauthorized();

  const formData = await request.formData();
  const audioFile = formData.get("audio") as File | null;

  if (!audioFile) return badRequest("audio file is required");

  const buffer = Buffer.from(await audioFile.arrayBuffer());
  const result = await transcribeAudio(buffer, audioFile.name);

  return NextResponse.json(result);
}
