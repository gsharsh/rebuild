export const MOCK_SCRIPT_ANALYSIS = {
  score: 72,
  strengths: [
    "You answered the question directly with a clear opening.",
    "Your example shows real experience the interviewer can follow.",
  ],
  improvements: [
    "Add one sentence on what you learned from the experience.",
    "End with a forward-looking line that connects to the role.",
  ],
  structureNotes:
    "Try a simple STAR pattern: Situation, Task, Action, Result — then a brief reflection.",
  listenerFriendlyPhrases: [
    "In that situation, my first step was...",
    "The result was that we delivered on time.",
  ],
  isMock: true,
};

export const MOCK_SPEECH_ANALYSIS = {
  score: 68,
  pace: "steady",
  clarity: "good",
  fillerWords: ["um", "like"],
  suggestions: [
    "Pause briefly after your main point so the listener can absorb it.",
    "Replace filler words with a short pause — that reads as confidence.",
  ],
  isMock: true,
};

export const MOCK_FINAL_FEEDBACK = {
  overallScore: 70,
  scriptScore: 72,
  speechScore: 68,
  postureScore: null,
  summary:
    "Solid interview readiness. Your answer has a clear structure and a believable example. With a stronger closing and one more specific detail, this will feel polished and listener-friendly.",
  improvedAnswer:
    "When I led our campus project, we had two weeks to prepare a demo for judges. I broke the work into daily milestones and checked in with each teammate. We shipped on time, and I learned how to keep a team aligned under pressure. That experience is why I am excited about this role.",
  easierToSayVersion:
    "I led a campus project with a tight deadline. I set daily goals and kept the team updated. We finished on time. I learned how to guide a team when time is short.",
  sixtySecondVersion:
    "I led a campus project with a two-week deadline. I created daily milestones and short check-ins. We delivered on time. I learned to keep teams aligned under pressure, which is why I want this role.",
  teachingNotes: [
    "Open with the situation in one sentence.",
    "Name your action clearly — use 'I' statements.",
    "Close by linking the result to the opportunity.",
  ],
  phrasesToPractice: [
    "My first step was to...",
    "The result was...",
    "That experience taught me...",
  ],
  isMock: true,
};

export const MOCK_GENERATED_QUESTION =
  "Tell me about a time you worked under pressure and how you kept your team on track.";

export const MOCK_TRANSLATION = {
  translatedText:
    "When I led our campus project, we had two weeks to prepare a demo. I set daily goals and kept everyone updated. We finished on time.",
  isMock: true,
};

export const MOCK_TRANSCRIPTION = {
  transcript:
    "I led a campus project where we had to deliver a demo in two weeks. I organized daily check-ins and we completed everything on time.",
  isMock: true,
};
