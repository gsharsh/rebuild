import type { AnalyzeResponse } from "@/lib/api-types";

export const DEMO_QUESTION =
  "Tell me about a technical project you built and one challenge you faced.";

export const DEMO_ANSWER =
  "I think one project I built was this app for helping people practise interviews. Like, the main challenge was that I had to connect the speech part and the script part, and I kind of learned how to make the feedback more useful for users.";

export const DEMO_ANALYZE_RESPONSE: AnalyzeResponse = {
  answer_id: "demo-answer-id",
  transcript: DEMO_ANSWER,
  speech_analysis: {
    pacing_words_per_minute: 142,
    energy_delivery_score: "Steady, conversational",
    hesitation_markers_detected: ["like", "I think", "kind of"],
  },
  script_analysis: {
    improved_script:
      "I built an app that helps people practise interviews. The main challenge was connecting speech analysis with script coaching. I learned how to make feedback more useful and listener-friendly for users.",
    changes_made: [
      {
        original: "I think one project I built was this app",
        fixed: "I built an app",
        reason: "A direct opening sounds more confident and interview-ready.",
      },
      {
        original: "Like, the main challenge",
        fixed: "The main challenge",
        reason: "Removing filler words creates clearer delivery.",
      },
      {
        original: "I kind of learned",
        fixed: "I learned",
        reason: "Replacing hedging language with a clear statement improves confidence coaching.",
      },
    ],
    coaching_lesson:
      "Your story has strong content. Lead with a clear statement, remove filler words, and end with what you learned.",
  },
  coach_audio_url: null,
};
