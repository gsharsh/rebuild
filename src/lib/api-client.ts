import { createClient } from "@/lib/supabase/client";
import type {
  AnalyzeResponse,
  AnalyzeTextPayload,
  Answer,
  CreateQuestionPayload,
  CreateSessionPayload,
  Question,
  Session,
} from "@/lib/api-types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function getAuthHeaders(): Promise<HeadersInit> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (session?.access_token) {
    headers.Authorization = `Bearer ${session.access_token}`;
  }

  return headers;
}

async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...headers,
      ...options.headers,
    },
  });

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      message = body.detail ?? body.error ?? body.message ?? message;
    } catch {
      // ignore parse errors
    }
    throw new ApiError(message, res.status);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json() as Promise<T>;
}

export async function getSessions(): Promise<Session[]> {
  return apiFetch<Session[]>("/api/sessions");
}

export async function createSession(
  payload: CreateSessionPayload
): Promise<Session> {
  return apiFetch<Session>("/api/sessions", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getSession(id: string): Promise<Session> {
  return apiFetch<Session>(`/api/sessions/${id}`);
}

export async function getSessionQuestions(
  sessionId: string
): Promise<Question[]> {
  return apiFetch<Question[]>(`/api/sessions/${sessionId}/questions`);
}

export async function createQuestion(
  payload: CreateQuestionPayload
): Promise<Question> {
  return apiFetch<Question>("/api/questions", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function deleteQuestion(questionId: string): Promise<void> {
  return apiFetch<void>(`/api/questions/${questionId}`, {
    method: "DELETE",
  });
}

export async function getQuestionAnswers(
  questionId: string
): Promise<Answer[]> {
  return apiFetch<Answer[]>(`/api/questions/${questionId}/answers`);
}

export async function analyzeText(
  payload: AnalyzeTextPayload
): Promise<AnalyzeResponse> {
  return apiFetch<AnalyzeResponse>("/api/answers/analyze-text", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function analyzeAudio(
  questionId: string,
  sessionId: string,
  file: Blob,
  durationSeconds: number,
  filename = "recording.webm"
): Promise<AnalyzeResponse> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const formData = new FormData();
  formData.append("question_id", questionId);
  formData.append("session_id", sessionId);
  formData.append("duration_seconds", String(durationSeconds));
  formData.append("file", file, filename);

  const headers: HeadersInit = {};
  if (session?.access_token) {
    headers.Authorization = `Bearer ${session.access_token}`;
  }

  const res = await fetch(`${API_URL}/api/answers/analyze-audio`, {
    method: "POST",
    headers,
    body: formData,
  });

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      message = body.detail ?? body.error ?? body.message ?? message;
    } catch {
      // ignore
    }
    throw new ApiError(message, res.status);
  }

  return res.json() as Promise<AnalyzeResponse>;
}
