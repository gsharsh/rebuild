"use client";

import { Search, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { INTERVIEW_TYPES } from "@/lib/api-types";

interface SessionToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  filterType: string;
  onFilterChange: (value: string) => void;
}

export function SessionToolbar({
  search,
  onSearchChange,
  filterType,
  onFilterChange,
}: SessionToolbarProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by role or organisation…"
          className="pl-9"
        />
      </div>
      <div className="relative w-full sm:w-52">
        <SlidersHorizontal className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
        <select
          value={filterType}
          onChange={(e) => onFilterChange(e.target.value)}
          className="w-full appearance-none rounded-lg border border-outline-variant bg-surface-elevated py-3 pl-9 pr-8 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-offset-2"
        >
          <option value="">All types</option>
          {INTERVIEW_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
