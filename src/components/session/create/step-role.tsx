"use client";

import { Input } from "@/components/ui/input";

interface StepRoleProps {
  role: string;
  organisation: string;
  onRoleChange: (value: string) => void;
  onOrganisationChange: (value: string) => void;
}

export function StepRole({
  role,
  organisation,
  onRoleChange,
  onOrganisationChange,
}: StepRoleProps) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900">Role & organisation</h2>
      <p className="mt-1 text-sm text-muted">
        Tell us what you&apos;re preparing for so questions feel realistic.
      </p>
      <div className="mt-6 space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Role <span className="text-red-500">*</span>
          </label>
          <Input
            value={role}
            onChange={(e) => onRoleChange(e.target.value)}
            placeholder="e.g. Software Engineering Intern"
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Organisation <span className="text-red-500">*</span>
          </label>
          <Input
            value={organisation}
            onChange={(e) => onOrganisationChange(e.target.value)}
            placeholder="e.g. Google, MIT, US Embassy"
            required
          />
        </div>
      </div>
    </div>
  );
}
