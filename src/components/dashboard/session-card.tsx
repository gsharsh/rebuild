"use client";

import Link from "next/link";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import type { Session } from "@/lib/api-types";
import { ArrowRight, Check, Copy, Menu, Pencil, Trash2, X } from "lucide-react";

interface SessionCardProps {
  session: Session;
  questionCount?: number;
  onRename?: (
    id: string,
    payload: { role: string; organisation: string }
  ) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

export function SessionCard({
  session,
  questionCount = 0,
  onRename,
  onDelete,
}: SessionCardProps) {
  const [editing, setEditing] = useState(false);
  const [role, setRole] = useState(session.role);
  const [organisation, setOrganisation] = useState(session.organisation);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  async function saveEdit() {
    if (!role.trim() || !organisation.trim() || !onRename) return;
    setBusy(true);
    setMessage("");
    try {
      await onRename(session.id, {
        role: role.trim(),
        organisation: organisation.trim(),
      });
      setEditing(false);
      setMenuOpen(false);
      setMessage("Renamed");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Rename failed");
    } finally {
      setBusy(false);
    }
  }

  async function deleteCurrent() {
    if (!onDelete) return;
    const ok = window.confirm(`Delete "${session.role}"? This removes its questions and answers.`);
    if (!ok) return;
    setBusy(true);
    setMessage("");
    try {
      await onDelete(session.id);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Delete failed");
      setBusy(false);
    }
  }

  async function shareSession() {
    const url = `${window.location.origin}/sessions/${session.id}`;
    try {
      await navigator.clipboard.writeText(url);
      setMenuOpen(false);
      setMessage("Link copied");
    } catch {
      setMessage(url);
    }
  }

  return (
    <Card className="group relative flex h-full flex-col transition-all hover:border-brand-300 hover:shadow-md">
      <CardContent className="flex flex-1 flex-col py-5">
        <div className="flex items-start justify-between gap-2">
          <Badge variant="info">{session.interview_type}</Badge>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted">{formatDate(session.updated_at)}</span>
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              className="flex h-8 w-8 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
              aria-label="Session actions"
            >
              <Menu className="h-4 w-4" />
            </button>
          </div>
        </div>
        {menuOpen && (
          <div className="absolute right-5 top-12 z-10 w-40 rounded-lg border border-border bg-white p-1 shadow-lg">
            <button
              type="button"
              onClick={() => {
                setEditing(true);
                setMenuOpen(false);
              }}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
            >
              <Pencil className="h-3.5 w-3.5" />
              Rename
            </button>
            <button
              type="button"
              onClick={() => void shareSession()}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
            >
              <Copy className="h-3.5 w-3.5" />
              Share link
            </button>
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                void deleteCurrent();
              }}
              disabled={busy}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </button>
          </div>
        )}
        {editing ? (
          <div className="mt-3 space-y-2">
            <input
              value={role}
              onChange={(event) => setRole(event.target.value)}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm font-medium"
              aria-label="Session name"
            />
            <input
              value={organisation}
              onChange={(event) => setOrganisation(event.target.value)}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm"
              aria-label="Organisation"
            />
          </div>
        ) : (
          <>
            <h3 className="mt-3 line-clamp-1 font-semibold text-gray-900">
              {session.role}
            </h3>
            <p className="line-clamp-1 text-sm text-muted">{session.organisation}</p>
          </>
        )}
        <p className="mt-3 text-xs text-muted">
          {questionCount} question{questionCount !== 1 ? "s" : ""}
        </p>
        {message && <p className="mt-2 truncate text-xs text-brand-700">{message}</p>}
        <div className="mt-auto pt-4">
          {editing && (
            <div className="mb-2 grid grid-cols-2 gap-2">
              <Button size="sm" onClick={() => void saveEdit()} disabled={busy}>
                <Check className="mr-1.5 h-3.5 w-3.5" />
                Save
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setRole(session.role);
                  setOrganisation(session.organisation);
                  setEditing(false);
                }}
                disabled={busy}
              >
                <X className="mr-1.5 h-3.5 w-3.5" />
                Cancel
              </Button>
            </div>
          )}
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
