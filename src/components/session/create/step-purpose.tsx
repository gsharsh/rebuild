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

const TYPE_ICONS: Record<string, React.ReactNode> = {
  "Job Interview": <Briefcase className="h-6 w-6" />,
  "Visa Interview": <Globe className="h-6 w-6" />,
  "College Interview": <GraduationCap className="h-6 w-6" />,
  "Scholarship Interview": <Award className="h-6 w-6" />,
  "Class Presentation": <Presentation className="h-6 w-6" />,
  "Hackathon Pitch": <Rocket className="h-6 w-6" />,
};

interface StepPurposeProps {
  value: string;
  onChange: (value: string) => void;
}

export function StepPurpose({ value, onChange }: StepPurposeProps) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900">What is this for?</h2>
      <p className="mt-1 text-sm text-muted">
        Choose the type of rehearsal that best matches your opportunity.
      </p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {INTERVIEW_TYPES.map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => onChange(type)}
            className={cn(
              "flex items-start gap-3 rounded-xl border p-4 text-left transition-all",
              value === type
                ? "border-brand-500 bg-brand-50 ring-2 ring-brand-200"
                : "border-border bg-white hover:border-brand-300 hover:bg-brand-50/50"
            )}
          >
            <span
              className={cn(
                "rounded-lg p-2",
                value === type ? "bg-brand-600 text-white" : "bg-gray-100 text-brand-700"
              )}
            >
              {TYPE_ICONS[type]}
            </span>
            <div>
              <p className="font-medium text-gray-900">{type}</p>
              <p className="mt-0.5 text-xs text-muted">
                Tailored coaching for this scenario
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
