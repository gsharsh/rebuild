"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

const INTERVIEW_TYPES = [
  "Job Interview",
  "Visa Interview",
  "College Interview",
  "Scholarship Interview",
  "Class Presentation",
  "Hackathon Pitch",
];

export default function NewSessionPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    interviewType: "Job Interview",
    role: "",
    organisation: "",
    context: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to create session");
      }

      const session = await res.json();
      router.push(`/sessions/${session.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Create New Session
        </h1>
        <p className="text-sm text-muted mb-6">
          Set up your rehearsal room with context about the opportunity.
        </p>

        <Card>
          <CardHeader>
            <h2 className="font-semibold">Session details</h2>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm text-muted block mb-1">
                  Interview type
                </label>
                <select
                  value={form.interviewType}
                  onChange={(e) =>
                    setForm({ ...form, interviewType: e.target.value })
                  }
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm"
                >
                  {INTERVIEW_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm text-muted block mb-1">Role</label>
                <Input
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  placeholder="e.g. Software Engineering Intern"
                  required
                />
              </div>

              <div>
                <label className="text-sm text-muted block mb-1">
                  Organisation
                </label>
                <Input
                  value={form.organisation}
                  onChange={(e) =>
                    setForm({ ...form, organisation: e.target.value })
                  }
                  placeholder="e.g. Google, MIT, US Embassy"
                  required
                />
              </div>

              <div>
                <label className="text-sm text-muted block mb-1">
                  Context / resume summary
                </label>
                <Textarea
                  value={form.context}
                  onChange={(e) =>
                    setForm({ ...form, context: e.target.value })
                  }
                  placeholder="Brief background: your major, key projects, why you're applying…"
                  rows={5}
                />
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <div className="flex gap-3">
                <Button type="submit" disabled={loading}>
                  {loading ? "Creating…" : "Start Session"}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => router.push("/dashboard")}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
