import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { textToSpeech } from "@/lib/elevenlabs";
import { v4 as uuidv4 } from "uuid";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { text } = body;

  if (!text) {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }

  const result = await textToSpeech(text, uuidv4());

  if (!result.audioPath) {
    return NextResponse.json({
      audioUrl: null,
      message:
        "Audio feedback is unavailable, but text feedback is ready. Add ELEVENLABS_API_KEY to .env.",
      isMock: result.isMock,
    });
  }

  return NextResponse.json({
    audioUrl: `/api/files/${result.audioPath}`,
    isMock: result.isMock,
  });
}
