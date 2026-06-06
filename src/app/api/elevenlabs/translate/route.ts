import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { translateText } from "@/lib/elevenlabs";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const inputText = body.inputText ?? body.text;
  const sourceLanguage = body.sourceLanguage ?? "auto";

  if (!inputText) {
    return NextResponse.json({ error: "inputText is required" }, { status: 400 });
  }

  const lang = sourceLanguage === "auto" ? "auto" : sourceLanguage;
  const result = await translateText(inputText, lang);

  return NextResponse.json({
    detectedLanguage: sourceLanguage,
    translatedText: result.translatedText,
    isMock: result.isMock,
  });
}
