import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import type { Session } from "@/lib/api-types";
import { ArrowRight } from "lucide-react";

interface SessionCardProps {
  session: Session;
  questionCount?: number;
}

export function SessionCard({ session, questionCount = 0 }: SessionCardProps) {
  return (
    <Card className="group flex h-full flex-col transition-all hover:border-brand-300 hover:shadow-md">
      <CardContent className="flex flex-1 flex-col py-5">
        <div className="flex items-start justify-between gap-2">
          <Badge variant="info">{session.interview_type}</Badge>
          <span className="text-xs text-muted">{formatDate(session.updated_at)}</span>
        </div>
        <h3 className="mt-3 font-semibold text-gray-900 line-clamp-1">{session.role}</h3>
        <p className="text-sm text-muted line-clamp-1">{session.organisation}</p>
        <p className="mt-3 text-xs text-muted">
          {questionCount} question{questionCount !== 1 ? "s" : ""}
        </p>
        <div className="mt-4 pt-2">
          <Link href={`/sessions/${session.id}`}>
            <Button size="sm" className="w-full group-hover:bg-brand-700">
              Continue
              <ArrowRight className="ml-2 h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
