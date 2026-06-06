import { MOCK_TRANSCRIPTION, MOCK_TRANSLATION } from "@/lib/mock-fallbacks";
import { writeFile } from "@/lib/storage";

const API_KEY = process.env.ELEVENLABS_API_KEY;
const VOICE_ID = process.env.ELEVENLABS_VOICE_ID ?? "21m00Tcm4TlvDq8ikWAM";

export async function transcribeAudio(
  buffer: Buffer,
  filename: string
): Promise<{ transcript: string; isMock: boolean }> {
  if (!API_KEY) {
    return MOCK_TRANSCRIPTION;
  }

  try {
    const formData = new FormData();
    const blob = new Blob([new Uint8Array(buffer)]);
    formData.append("file", blob, filename);
    formData.append("model_id", "scribe_v1");

    const response = await fetch(
      "https://api.elevenlabs.io/v1/speech-to-text",
      {
        method: "POST",
        headers: { "xi-api-key": API_KEY },
        body: formData,
      }
    );

    if (!response.ok) throw new Error("Transcription failed");

    const data = (await response.json()) as { text?: string };
    return { transcript: data.text ?? "", isMock: false };
  } catch {
    return MOCK_TRANSCRIPTION;
  }
}

export async function translateText(
  text: string,
  sourceLanguage: string
): Promise<{ translatedText: string; isMock: boolean }> {
  if (!API_KEY) {
    return MOCK_TRANSLATION;
  }

  try {
    const response = await fetch(
      "https://api.elevenlabs.io/v1/translation",
      {
        method: "POST",
        headers: {
          "xi-api-key": API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          source_lang: sourceLanguage,
          target_lang: "en",
        }),
      }
    );

    if (!response.ok) throw new Error("Translation failed");

    const data = (await response.json()) as { translated_text?: string };
    return { translatedText: data.translated_text ?? text, isMock: false };
  } catch {
    return MOCK_TRANSLATION;
  }
}

export async function textToSpeech(
  text: string,
  answerId: string
): Promise<{ audioPath: string | null; isMock: boolean }> {
  if (!API_KEY) {
    return { audioPath: null, isMock: true };
  }

  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": API_KEY,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_multilingual_v2",
        }),
      }
    );

    if (!response.ok) throw new Error("TTS failed");

    const buffer = Buffer.from(await response.arrayBuffer());
    const filePath = await writeFile(
      buffer,
      `feedback-${answerId}.mp3`,
      "audio"
    );
    return { audioPath: filePath, isMock: false };
  } catch {
    return { audioPath: null, isMock: true };
  }
}
