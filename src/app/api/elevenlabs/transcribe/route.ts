import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { transcribeAudio } from "@/lib/elevenlabs";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const audioFile =
    (formData.get("audioFile") as File | null) ??
    (formData.get("audio") as File | null);

  if (!audioFile) {
    return NextResponse.json(
      { error: true, message: "audioFile is required", transcript: "" },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await audioFile.arrayBuffer());
  const result = await transcribeAudio(buffer, audioFile.name);

  if (result.isMock && !process.env.ELEVENLABS_API_KEY) {
    return NextResponse.json({
      error: true,
      message:
        "Transcription failed. Add ELEVENLABS_API_KEY to .env or paste your transcript manually.",
      transcript: "",
      isMock: true,
    });
  }

  return NextResponse.json({
    detectedLanguage: "auto",
    transcript: result.transcript,
    durationSeconds: 0,
    isMock: result.isMock,
  });
}
