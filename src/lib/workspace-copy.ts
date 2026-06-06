export interface WorkspaceCopy {
  isPresentationLike: boolean;
  sidebarTitle: string;
  emptyText: string;
  generateLabel: string;
  generatingLabel: string;
  addPlaceholder: string;
  itemPrefix: string;
  practiseTitle: string;
  practiseTextPlaceholder: string;
  audioHelp: string;
  defaultPrompt: (session: {
    role: string;
    organisation: string;
    context: string | null;
  }) => string;
}

const INTERVIEW_COPY: WorkspaceCopy = {
  isPresentationLike: false,
  sidebarTitle: "Questions",
  emptyText: "Add or generate a question to begin practising.",
  generateLabel: "Generate mock question",
  generatingLabel: "Generating...",
  addPlaceholder: "Type your own question...",
  itemPrefix: "Q",
  practiseTitle: "Practise your answer",
  practiseTextPlaceholder: "Type your interview answer here...",
  audioHelp:
    "Record your spoken answer. We'll transcribe it and provide speech coaching.",
  defaultPrompt: () =>
    "Tell me about yourself and why this opportunity matters to you.",
};

export function getWorkspaceCopy(interviewType: string): WorkspaceCopy {
  if (interviewType === "Class Presentation") {
    return {
      isPresentationLike: true,
      sidebarTitle: "Presentation sections",
      emptyText: "Create a presentation practice prompt to begin rehearsing.",
      generateLabel: "Use full presentation",
      generatingLabel: "Preparing...",
      addPlaceholder: "Add a section to practise...",
      itemPrefix: "Part",
      practiseTitle: "Practise your presentation",
      practiseTextPlaceholder: "Paste or type the presentation script you want to practise...",
      audioHelp:
        "Record your presentation delivery. We'll coach pacing, clarity, filler words, and vocal expression.",
      defaultPrompt: (session) =>
        `Practise the full presentation: ${session.role}. Audience: ${session.organisation}. ${
          session.context ? `Context: ${session.context}` : ""
        }`.trim(),
    };
  }

  if (interviewType === "Hackathon Pitch") {
    return {
      ...INTERVIEW_COPY,
      isPresentationLike: true,
      sidebarTitle: "Pitch sections",
      emptyText: "Create a pitch section to begin rehearsing.",
      generateLabel: "Use full pitch",
      generatingLabel: "Preparing...",
      addPlaceholder: "Add a pitch section...",
      itemPrefix: "Part",
      practiseTitle: "Practise your pitch",
      practiseTextPlaceholder: "Paste or type the pitch script you want to practise...",
      audioHelp:
        "Record your pitch delivery. We'll coach pacing, clarity, confidence, and energy.",
      defaultPrompt: (session) =>
        `Practise the full hackathon pitch for ${session.role}. Audience: ${session.organisation}. ${
          session.context ? `Context: ${session.context}` : ""
        }`.trim(),
    };
  }

  return INTERVIEW_COPY;
}
