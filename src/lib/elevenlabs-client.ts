/** Browser-safe client — calls YOUR Next.js routes, never exposes the API key. */

export async function transcribeAudioFile(file: Blob, filename = "recording.webm") {
  const formData = new FormData();
  formData.append("audioFile", file, filename);

  const res = await fetch("/api/elevenlabs/transcribe", {
    method: "POST",
    body: formData,
  });
  return res.json() as Promise<{
    transcript: string;
    detectedLanguage?: string;
    error?: boolean;
    message?: string;
    isMock?: boolean;
  }>;
}

export async function translateText(
  inputText: string,
  sourceLanguage: string = "auto"
) {
  const res = await fetch("/api/elevenlabs/translate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ inputText, sourceLanguage, targetLanguage: "English" }),
  });
  return res.json() as Promise<{
    translatedText: string;
    detectedLanguage?: string;
    isMock?: boolean;
  }>;
}

export async function speakText(text: string) {
  const res = await fetch("/api/elevenlabs/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  return res.json() as Promise<{
    audioUrl: string | null;
    message?: string;
    isMock?: boolean;
  }>;
}
