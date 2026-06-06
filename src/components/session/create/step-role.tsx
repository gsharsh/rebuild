"use client";

import { Input } from "@/components/ui/input";
import { getPurposeCopy } from "@/lib/purpose-copy";

interface StepRoleProps {
  interviewType: string;
  role: string;
  organisation: string;
  onRoleChange: (value: string) => void;
  onOrganisationChange: (value: string) => void;
}

export function StepRole({
  interviewType,
  role,
  organisation,
  onRoleChange,
  onOrganisationChange,
}: StepRoleProps) {
  const copy = getPurposeCopy(interviewType);

  return (
    <section>
      <h1 className="text-2xl font-semibold tracking-tight text-on-surface sm:text-3xl">
        {copy.roleTitle}
      </h1>
      <p className="mt-2 text-on-surface-variant">{copy.roleDescription}</p>
      <div className="mt-8 space-y-6">
        <div className="flex flex-col gap-2">
          <label
            htmlFor="role"
            className="text-xs font-semibold uppercase tracking-wider text-on-surface"
          >
            {copy.roleLabel} *
          </label>
          <Input
            id="role"
            value={role}
            onChange={(e) => onRoleChange(e.target.value)}
            placeholder={copy.rolePlaceholder}
            required
          />
        </div>
        <div className="flex flex-col gap-2">
          <label
            htmlFor="org"
            className="text-xs font-semibold uppercase tracking-wider text-on-surface"
          >
            {copy.organisationLabel} *
          </label>
          <Input
            id="org"
            value={organisation}
            onChange={(e) => onOrganisationChange(e.target.value)}
            placeholder={copy.organisationPlaceholder}
            required
          />
        </div>
      </div>
    </section>
  );
}
