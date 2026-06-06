"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { StepPurpose } from "@/components/session/create/step-purpose";
import { StepRole } from "@/components/session/create/step-role";
import { StepContext } from "@/components/session/create/step-context";
import { createSession } from "@/lib/api-client";
import { ArrowLeft, ArrowRight, Rocket } from "lucide-react";

const STEPS = ["Purpose", "Role", "Context"] as const;
const STEP_LABELS = ["General Setup", "Target Details", "Additional Context"] as const;

export function CreateSessionWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const creatingRef = useRef(false);
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
    if (creatingRef.current || loading) return;
    creatingRef.current = true;
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
      creatingRef.current = false;
      setLoading(false);
    }
  }

  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <div className="min-h-screen bg-surface">
      <DashboardHeader />
      <main className="mx-auto max-w-3xl px-4 pb-16 pt-8 sm:px-6">
        <div className="mb-10">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-widest text-secondary">
              Step {step + 1} of {STEPS.length}
            </span>
            <span className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant">
              {STEP_LABELS[step]}
            </span>
          </div>
          <div className="h-1 w-full overflow-hidden rounded-full bg-surface-container-high">
            <div
              className="h-full bg-secondary transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <form
          className="space-y-8"
          onSubmit={(e) => {
            e.preventDefault();
          }}
        >
          {step === 0 && (
            <StepPurpose
              value={form.interview_type}
              onChange={(v) => setForm({ ...form, interview_type: v })}
            />
          )}
          {step === 1 && (
            <StepRole
              interviewType={form.interview_type}
              role={form.role}
              organisation={form.organisation}
              onRoleChange={(v) => setForm({ ...form, role: v })}
              onOrganisationChange={(v) => setForm({ ...form, organisation: v })}
            />
          )}
          {step === 2 && (
            <StepContext
              interviewType={form.interview_type}
              context={form.context}
              onContextChange={(v) => setForm({ ...form, context: v })}
              resumeUrl={form.resume_url}
              onResumeUrlChange={(v) => setForm({ ...form, resume_url: v })}
            />
          )}

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
          )}

          <div className="flex items-center justify-between pt-4">
            {step > 0 ? (
              <Button
                type="button"
                variant="secondary"
                onClick={() => setStep(step - 1)}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            ) : (
              <Button
                type="button"
                variant="secondary"
                onClick={() => router.push("/dashboard")}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Cancel
              </Button>
            )}
            <div className="flex-grow" />
            {step < STEPS.length - 1 ? (
              <Button
                type="button"
                onClick={() => setStep(step + 1)}
                disabled={!canProceed()}
                className="gap-2 px-8"
              >
                Next Step
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleCreate}
                disabled={loading}
                className="gap-2 px-8"
              >
                {loading ? "Launching…" : "Launch Session"}
                <Rocket className="h-4 w-4" />
              </Button>
            )}
          </div>
        </form>
      </main>
    </div>
  );
}
