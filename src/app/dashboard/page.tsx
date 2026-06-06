"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { SessionCard } from "@/components/dashboard/session-card";
import { SessionToolbar } from "@/components/dashboard/session-toolbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { deleteSession, getSessions } from "@/lib/api-client";
import { createClient } from "@/lib/supabase/client";
import type { Session } from "@/lib/api-types";
import { Plus, Briefcase } from "lucide-react";

export default function DashboardPage() {
  const [userName, setUserName] = useState("");
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          setUserName(
            user.user_metadata?.full_name ??
              user.user_metadata?.name ??
              user.email ??
              ""
          );
        }

        const data = await getSessions();
        setSessions(data);
      } catch {
        setSessions([]);
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  async function handleDeleteSession(sessionId: string) {
    if (!confirm("Delete this session? This cannot be undone.")) return;
    setDeletingId(sessionId);
    setDeleteError("");
    try {
      await deleteSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not delete session.";
      setDeleteError(message);
    } finally {
      setDeletingId(null);
    }
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return sessions.filter((s) => {
      const matchesSearch =
        !q ||
        s.role.toLowerCase().includes(q) ||
        s.organisation.toLowerCase().includes(q);
      const matchesType = !filterType || s.interview_type === filterType;
      return matchesSearch && matchesType;
    });
  }, [sessions, search, filterType]);

  return (
    <div className="min-h-screen bg-surface">
      <DashboardHeader userName={userName} />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-on-surface">
              Your Sessions
            </h1>
            <p className="mt-1 text-sm text-on-surface-variant">
              Interview and presentation rehearsal rooms
            </p>
          </div>
          <Link href="/sessions/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              New Session
            </Button>
          </Link>
        </div>

        {deleteError && (
          <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            {deleteError}
          </p>
        )}

        <div className="mb-6">
          <SessionToolbar
            search={search}
            onSearchChange={setSearch}
            filterType={filterType}
            onFilterChange={setFilterType}
          />
        </div>

        {loading ? (
          <p className="text-sm text-on-surface-variant">Loading sessions…</p>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Briefcase className="mx-auto mb-3 h-10 w-10 text-outline-variant" />
              <h3 className="font-semibold text-on-surface">
                {sessions.length === 0 ? "No sessions yet" : "No matching sessions"}
              </h3>
              <p className="mt-1 mb-4 text-sm text-on-surface-variant">
                {sessions.length === 0
                  ? "Create your first rehearsal session to start practising."
                  : "Try adjusting your search or filter."}
              </p>
              {sessions.length === 0 && (
                <Link href="/sessions/new">
                  <Button>New Session</Button>
                </Link>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((s) => (
              <SessionCard
                key={s.id}
                session={s}
                onDelete={handleDeleteSession}
                deleting={deletingId === s.id}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
