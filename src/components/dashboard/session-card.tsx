"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import type { Session } from "@/lib/api-types";
import { ArrowRight, Trash2 } from "lucide-react";

interface SessionCardProps {
  session: Session;
  questionCount?: number;
  onDelete?: (id: string) => Promise<void>;
  deleting?: boolean;
}

export function SessionCard({
  session,
  questionCount = 0,
  onDelete,
  deleting = false,
}: SessionCardProps) {
  return (
    <Card className="group relative flex h-full flex-col transition-all hover:border-secondary hover:shadow-md">
      {onDelete && (
        <button
          type="button"
          title="Delete session"
          disabled={deleting}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            void onDelete(session.id);
          }}
          className="absolute right-3 top-3 z-10 rounded-md p-1.5 text-on-surface-variant transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
      <CardContent className="flex flex-1 flex-col py-5">
        <div className="flex items-start justify-between gap-2 pr-8">
          <Badge variant="info">{session.interview_type}</Badge>
          <span className="text-xs text-on-surface-variant">
            {formatDate(session.updated_at)}
          </span>
        </div>
        <h3 className="mt-3 line-clamp-1 font-semibold text-on-surface">{session.role}</h3>
        <p className="line-clamp-1 text-sm text-on-surface-variant">
          {session.organisation}
        </p>
        <p className="mt-3 text-xs text-on-surface-variant">
          {questionCount} question{questionCount !== 1 ? "s" : ""}
        </p>
        <div className="mt-4 pt-2">
          <Link href={`/sessions/${session.id}`}>
            <Button variant="secondary" size="sm" className="w-full">
              Continue
              <ArrowRight className="ml-2 h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
