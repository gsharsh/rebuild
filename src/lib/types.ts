export interface ScriptAnalysis {
  score: number;
  strengths: string[];
  improvements: string[];
  structureNotes: string;
  listenerFriendlyPhrases: string[];
  isMock?: boolean;
}

export interface SpeechAnalysis {
  score: number;
  pace: string;
  clarity: string;
  fillerWords: string[];
  suggestions: string[];
  isMock?: boolean;
}

export interface FinalFeedback {
  overallScore: number;
  scriptScore: number;
  speechScore: number | null;
  postureScore: number | null;
  summary: string;
  improvedAnswer: string;
  easierToSayVersion: string;
  sixtySecondVersion: string;
  teachingNotes: string[];
  phrasesToPractice: string[];
  isMock?: boolean;
}
