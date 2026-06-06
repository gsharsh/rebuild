export interface PurposeCopy {
  roleTitle: string;
  roleDescription: string;
  roleLabel: string;
  rolePlaceholder: string;
  organisationLabel: string;
  organisationPlaceholder: string;
  contextTitle: string;
  contextDescription: string;
  contextLabel: string;
  contextPlaceholder: string;
  showResumeUpload: boolean;
}

const DEFAULT_COPY: PurposeCopy = {
  roleTitle: "Role & organisation",
  roleDescription: "Tell us what you're preparing for so questions feel realistic.",
  roleLabel: "Role",
  rolePlaceholder: "e.g. Software Engineering Intern",
  organisationLabel: "Organisation",
  organisationPlaceholder: "e.g. Google, MIT, US Embassy",
  contextTitle: "Add context",
  contextDescription:
    "Share background details or upload your resume to personalise coaching.",
  contextLabel: "Background context",
  contextPlaceholder:
    "Your major, key projects, why you're applying, relevant experience...",
  showResumeUpload: true,
};

export const PURPOSE_COPY: Record<string, PurposeCopy> = {
  "Job Interview": {
    ...DEFAULT_COPY,
    roleTitle: "Target role",
    roleDescription: "Name the job and company so the coach can ask realistic interview questions.",
    roleLabel: "Job title",
    rolePlaceholder: "e.g. Software Engineering Intern",
    organisationLabel: "Company",
    organisationPlaceholder: "e.g. Google",
    contextTitle: "Add resume context",
    contextDescription: "Share projects, skills, experience, and anything from your resume the coach should know.",
    contextPlaceholder: "Relevant projects, skills, achievements, why this role interests you...",
  },
  "Visa Interview": {
    ...DEFAULT_COPY,
    roleTitle: "Visa details",
    roleDescription: "Tell us the visa situation so practice questions match the interview.",
    roleLabel: "Visa type / applicant role",
    rolePlaceholder: "e.g. F-1 Student Visa Applicant",
    organisationLabel: "Embassy / destination",
    organisationPlaceholder: "e.g. US Embassy, Singapore to United States",
    contextTitle: "Add visa context",
    contextDescription: "Share your study/work plans, ties to home, funding, and travel purpose.",
    contextLabel: "Visa background",
    contextPlaceholder: "Program or trip purpose, sponsor/funding, home ties, previous travel, concerns to practice...",
    showResumeUpload: false,
  },
  "College Interview": {
    ...DEFAULT_COPY,
    roleTitle: "College details",
    roleDescription: "Name the school and program so the coach can tailor admissions questions.",
    roleLabel: "Program / applicant type",
    rolePlaceholder: "e.g. Computer Science Applicant",
    organisationLabel: "College",
    organisationPlaceholder: "e.g. NYU, MIT, UC Berkeley",
    contextTitle: "Add admissions context",
    contextDescription: "Share your academic interests, activities, story, and why this school fits.",
    contextLabel: "Admissions background",
    contextPlaceholder: "Intended major, activities, personal story, why this college, achievements...",
  },
  "Scholarship Interview": {
    ...DEFAULT_COPY,
    roleTitle: "Scholarship details",
    roleDescription: "Name the scholarship and candidate profile so practice feels specific.",
    roleLabel: "Candidate focus",
    rolePlaceholder: "e.g. First-generation STEM Scholar",
    organisationLabel: "Scholarship / foundation",
    organisationPlaceholder: "e.g. Gates Scholarship",
    contextTitle: "Add scholarship context",
    contextDescription: "Share leadership, service, need, achievements, and the story you want to communicate.",
    contextLabel: "Scholarship background",
    contextPlaceholder: "Leadership, community impact, challenges overcome, goals, why this scholarship...",
  },
  "Class Presentation": {
    ...DEFAULT_COPY,
    roleTitle: "Presentation details",
    roleDescription: "Describe the presentation so coaching focuses on clarity and audience fit.",
    roleLabel: "Presentation topic",
    rolePlaceholder: "e.g. Planes and Aircraft",
    organisationLabel: "Class / audience",
    organisationPlaceholder: "e.g. Physics class, high school students",
    contextTitle: "Add presentation context",
    contextDescription: "Share what the audience needs to learn and which parts you want to practice.",
    contextLabel: "Presentation background",
    contextPlaceholder: "Main points, required length, audience level, visuals, parts that feel hard to explain...",
    showResumeUpload: false,
  },
  "Hackathon Pitch": {
    ...DEFAULT_COPY,
    roleTitle: "Pitch details",
    roleDescription: "Name the product and event so the coach can simulate judge questions.",
    roleLabel: "Project / product",
    rolePlaceholder: "e.g. SpeakReady",
    organisationLabel: "Hackathon / audience",
    organisationPlaceholder: "e.g. Rebuild x ElevenLabs judges",
    contextTitle: "Add pitch context",
    contextDescription: "Share the problem, users, demo flow, tech stack, traction, and ask.",
    contextLabel: "Pitch background",
    contextPlaceholder: "Problem, target users, solution, demo highlights, tech stack, impact, next steps...",
    showResumeUpload: false,
  },
};

export function getPurposeCopy(interviewType: string): PurposeCopy {
  return PURPOSE_COPY[interviewType] ?? DEFAULT_COPY;
}
