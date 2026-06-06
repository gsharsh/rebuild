"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { StepPurpose } from "@/components/session/create/step-purpose";
import { StepRole } from "@/components/session/create/step-role";
import { StepContext } from "@/components/session/create/step-context";
import { createSession } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

const STEPS = ["Purpose", "Role", "Context"];

export function CreateSessionWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    interview_type: "Job Interview",
    role: "",
    organisation: "",
    context: "",
    resume_url: null as string | null,
  });

  function canProceed(): boolean {
    if (step === 1) {
      return form.role.trim().length > 0 && form.organisation.trim().length > 0;
    }
    return true;
  }

  async function handleCreate() {
    setLoading(true);
    setError("");
    try {
      const context = form.resume_url
        ? `${form.context}\n\nResume: ${form.resume_url}`.trim()
        : form.context.trim() || undefined;

      const session = await createSession({
        interview_type: form.interview_type,
        role: form.role.trim(),
        organisation: form.organisation.trim(),
        context: context ?? null,
      });
      router.push(`/sessions/${session.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create session");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-surface">
      <DashboardHeader />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">New session</h1>
          <p className="mt-1 text-sm text-muted">
            Set up your rehearsal room in three quick steps.
          </p>
        </div>

        <div className="mb-8 flex items-center gap-2">
          {STEPS.map((label, i) => (
            <div key={label} className="flex flex-1 items-center gap-2">
              <div
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-medium",
                  i < step
                    ? "bg-brand-600 text-white"
                    : i === step
                      ? "bg-brand-100 text-brand-700 ring-2 ring-brand-500"
                      : "bg-gray-100 text-muted"
                )}
              >
                {i < step ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              <span
                className={cn(
                  "hidden text-sm sm:inline",
                  i === step ? "font-medium text-gray-900" : "text-muted"
                )}
              >
                {label}
              </span>
              {i < STEPS.length - 1 && (
                <div
                  className={cn(
                    "mx-1 h-px flex-1",
                    i < step ? "bg-brand-400" : "bg-border"
                  )}
                />
              )}
            </div>
          ))}
        </div>

        <Card>
          <CardContent className="py-6">
            {step === 0 && (
              <StepPurpose
                value={form.interview_type}
                onChange={(v) => setForm({ ...form, interview_type: v })}
              />
            )}
            {step === 1 && (
              <StepRole
                role={form.role}
                organisation={form.organisation}
                onRoleChange={(v) => setForm({ ...form, role: v })}
                onOrganisationChange={(v) => setForm({ ...form, organisation: v })}
              />
            )}
            {step === 2 && (
              <StepContext
                context={form.context}
                onContextChange={(v) => setForm({ ...form, context: v })}
                resumeUrl={form.resume_url}
                onResumeUrlChange={(v) => setForm({ ...form, resume_url: v })}
              />
            )}

            {error && (
              <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
                {error}
              </p>
            )}

            <div className="mt-8 flex justify-between gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => (step === 0 ? router.push("/dashboard") : setStep(step - 1))}
              >
                {step === 0 ? "Cancel" : "Back"}
              </Button>
              {step < STEPS.length - 1 ? (
                <Button
                  type="button"
                  onClick={() => setStep(step + 1)}
                  disabled={!canProceed()}
                >
                  Continue
                </Button>
              ) : (
                <Button type="button" onClick={handleCreate} disabled={loading}>
                  {loading ? "Creating…" : "Start session"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
