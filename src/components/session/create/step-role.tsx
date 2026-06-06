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
    <div>
      <h2 className="text-lg font-semibold text-gray-900">{copy.roleTitle}</h2>
      <p className="mt-1 text-sm text-muted">
        {copy.roleDescription}
      </p>
      <div className="mt-6 space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            {copy.roleLabel} <span className="text-red-500">*</span>
          </label>
          <Input
            value={role}
            onChange={(e) => onRoleChange(e.target.value)}
            placeholder={copy.rolePlaceholder}
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            {copy.organisationLabel} <span className="text-red-500">*</span>
          </label>
          <Input
            value={organisation}
            onChange={(e) => onOrganisationChange(e.target.value)}
            placeholder={copy.organisationPlaceholder}
            required
          />
        </div>
      </div>
    </div>
  );
}
