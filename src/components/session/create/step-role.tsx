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
    <section>
      <h1 className="text-2xl font-semibold tracking-tight text-on-surface sm:text-3xl">
        Define your target
      </h1>
      <p className="mt-2 text-on-surface-variant">
        Role and organisation are required.
      </p>
      <div className="mt-8 space-y-6">
        <div className="flex flex-col gap-2">
          <label
            htmlFor="role"
            className="text-xs font-semibold uppercase tracking-wider text-on-surface"
          >
            Target Role / Position *
          </label>
          <Input
            id="role"
            value={role}
            onChange={(e) => onRoleChange(e.target.value)}
            placeholder="e.g. Senior Product Designer"
            required
          />
        </div>
        <div className="flex flex-col gap-2">
          <label
            htmlFor="org"
            className="text-xs font-semibold uppercase tracking-wider text-on-surface"
          >
            Organization / Agency *
          </label>
          <Input
            id="org"
            value={organisation}
            onChange={(e) => onOrganisationChange(e.target.value)}
            placeholder="e.g. Acme Corp"
            required
          />
        </div>
      </div>
    </section>
  );
}
