export interface Session {
  id: string;
  user_id: string;
  interview_type: string;
  role: string;
  organisation: string;
  context: string | null;
  created_at: string;
  updated_at: string;
}

export interface Question {
  id: string;
  session_id: string;
  question_text: string;
  source: string;
  created_at: string;
}

export interface ScriptChange {
  original: string;
  fixed: string;
  reason: string;
}

export interface ScriptAnalysis {
  improved_script: string;
  changes_made: ScriptChange[];
  coaching_lesson: string;
  words_to_practice?: string[];
  coaching_fallback?: boolean;
}

export interface SpeechAnalysis {
  pacing_words_per_minute: number;
  energy_delivery_score: string;
  hesitation_markers_detected: string[];
  pace_label?: string;
  filler_count?: number;
  filler_per_minute?: number;
  confidence_phrases?: string[];
  repeated_words?: string[];
  long_sentences?: string[];
  struggle_sentences?: Array<{
    sentence: string;
    reason: string;
    severity: string;
  }>;
  feedback?: string[];
  practice_targets?: Array<{
    type: string;
    focus: string;
    original: string;
    demo: string;
    practice_cue: string;
  }>;
  valence?: {
    raw?: Record<string, unknown>;
    normalizedTags?: string[];
    primaryFocus?: string;
    scores?: Record<string, number>;
    valenceFailed?: boolean;
  };
  emotional_coach_ssml?: string;
  emotional_coach_text?: string;
  emotional_next_action?: string;
  coach_audio_error?: string;
}

export interface Answer {
  id: string;
  question_id: string;
  session_id: string;
  user_id: string;
  original_text: string | null;
  transcript: string | null;
  native_language: string | null;
  translated_text: string | null;
  duration_seconds: number | null;
  audio_url: string | null;
  video_url: string | null;
  speech_analysis: SpeechAnalysis | Record<string, unknown>;
  script_analysis: ScriptAnalysis | Record<string, unknown>;
  posture_analysis: Record<string, unknown> | null;
  created_at: string;
}

export interface AnalyzeResponse {
  answer_id: string;
  transcript: string;
  speech_analysis: SpeechAnalysis;
  script_analysis: ScriptAnalysis;
  coach_audio_url: string | null;
  coach_audio_error?: string | null;
}

export interface CreateSessionPayload {
  interview_type: string;
  role: string;
  organisation: string;
  context?: string | null;
}

export interface UpdateSessionPayload {
  role?: string;
  organisation?: string;
  context?: string | null;
}

export interface CreateQuestionPayload {
  session_id: string;
  question_text: string;
  source?: string;
}

export interface AnalyzeTextPayload {
  question_id: string;
  session_id: string;
  original_text: string;
  native_language?: string;
}

export interface SessionWithQuestions extends Session {
  questions?: QuestionWithAnswers[];
}

export interface QuestionWithAnswers extends Question {
  answers?: Answer[];
}

export type AnswerMode = "text" | "audio" | "video";

export const INTERVIEW_TYPES = [
  "Job Interview",
  "Visa Interview",
  "College Interview",
  "Scholarship Interview",
  "Class Presentation",
  "Hackathon Pitch",
] as const;

export type InterviewType = (typeof INTERVIEW_TYPES)[number];
