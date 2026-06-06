"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatScore } from "@/lib/utils";
import { Plus, Briefcase } from "lucide-react";

interface SessionCard {
  id: string;
  interviewType: string;
  role: string;
  organisation: string;
  updatedAt: string;
  latestScore: number | null;
  questionCount: number;
}

export default function DashboardPage() {
  const [userName, setUserName] = useState("");
  const [sessions, setSessions] = useState<SessionCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [meRes, sessionsRes] = await Promise.all([
          fetch("/api/me"),
          fetch("/api/sessions"),
        ]);
        if (meRes.ok) {
          const me = await meRes.json();
          setUserName(me.name ?? me.email);
        }
        if (sessionsRes.ok) {
          setSessions(await sessionsRes.json());
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="min-h-screen">
      <Header userName={userName} />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Welcome{userName ? `, ${userName.split(" ")[0]}` : ""}
            </h1>
            <p className="text-muted text-sm mt-1">
              Your interview and presentation rehearsal sessions
            </p>
          </div>
          <Link href="/sessions/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create New Session
            </Button>
          </Link>
        </div>

        {loading ? (
          <p className="text-muted text-sm">Loading sessions…</p>
        ) : sessions.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Briefcase className="h-10 w-10 text-gray-300 mx-auto mb-3" />
              <h3 className="font-medium text-gray-900">No sessions yet</h3>
              <p className="text-sm text-muted mt-1 mb-4">
                Create your first rehearsal session to start practising.
              </p>
              <Link href="/sessions/new">
                <Button>Create New Session</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sessions.map((s) => (
              <Link key={s.id} href={`/sessions/${s.id}`}>
                <Card className="hover:border-brand-300 hover:shadow-md transition-all cursor-pointer h-full">
                  <CardContent className="py-5">
                    <div className="flex items-start justify-between">
                      <Badge variant="info">{s.interviewType}</Badge>
                      {s.latestScore != null && (
                        <span className="text-sm font-semibold text-brand-700">
                          {formatScore(s.latestScore)}
                        </span>
                      )}
                    </div>
                    <h3 className="font-semibold text-gray-900 mt-3">
                      {s.role}
                    </h3>
                    <p className="text-sm text-muted">{s.organisation}</p>
                    <div className="mt-4 flex items-center justify-between text-xs text-muted">
                      <span>{s.questionCount} question{s.questionCount !== 1 ? "s" : ""}</span>
                      <span>{formatDate(s.updatedAt)}</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
