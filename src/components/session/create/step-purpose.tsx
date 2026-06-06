"use client";

import { cn } from "@/lib/utils";
import { INTERVIEW_TYPES } from "@/lib/api-types";
import {
  Briefcase,
  GraduationCap,
  Globe,
  Award,
  Presentation,
  Rocket,
} from "lucide-react";

const TYPE_META: Record<
  string,
  { icon: React.ReactNode; description: string }
> = {
  "Job Interview": {
    icon: <Briefcase className="h-8 w-8" />,
    description: "Technical and behavioral rounds for corporate roles.",
  },
  "Visa Interview": {
    icon: <Globe className="h-8 w-8" />,
    description: "Consular questioning and documentation verification.",
  },
  "College Interview": {
    icon: <GraduationCap className="h-8 w-8" />,
    description: "Academic background and motivation discussions.",
  },
  "Scholarship Interview": {
    icon: <Award className="h-8 w-8" />,
    description: "Merit, goals, and financial need conversations.",
  },
  "Class Presentation": {
    icon: <Presentation className="h-8 w-8" />,
    description: "Structured delivery for academic presentations.",
  },
  "Hackathon Pitch": {
    icon: <Rocket className="h-8 w-8" />,
    description: "Fast-paced product and demo pitches.",
  },
};

interface StepPurposeProps {
  value: string;
  onChange: (value: string) => void;
}

export function StepPurpose({ value, onChange }: StepPurposeProps) {
  return (
    <section>
      <h1 className="text-2xl font-semibold tracking-tight text-on-surface sm:text-3xl">
        What is this rehearsal for?
      </h1>
      <p className="mt-2 text-on-surface-variant">
        Select the scenario you want to practice.
      </p>
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {INTERVIEW_TYPES.map((type) => {
          const meta = TYPE_META[type];
          const selected = value === type;
          return (
            <button
              key={type}
              type="button"
              onClick={() => onChange(type)}
              className={cn(
                "rounded-lg border p-6 text-left transition-all",
                selected
                  ? "border-secondary bg-surface-container-low"
                  : "border-outline-variant bg-surface-elevated hover:border-secondary"
              )}
            >
              <span
                className={cn(
                  "mb-4 block text-secondary",
                  selected && "text-secondary-dark"
                )}
              >
                {meta.icon}
              </span>
              <h3 className="text-base font-semibold text-on-surface">{type}</h3>
              <p className="mt-1 text-sm text-on-surface-variant">
                {meta.description}
              </p>
            </button>
          );
        })}
      </div>
    </section>
  );
}
