"use client";

import { useRef, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { uploadResume } from "@/lib/supabase/storage";
import { createClient } from "@/lib/supabase/client";
import { CheckCircle, CloudUpload, X } from "lucide-react";

interface StepContextProps {
  context: string;
  onContextChange: (value: string) => void;
  resumeUrl: string | null;
  onResumeUrlChange: (url: string | null) => void;
}

export function StepContext({
  context,
  onContextChange,
  resumeUrl,
  onResumeUrlChange,
}: StepContextProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  async function handleFileSelect(file: File) {
    setUploading(true);
    setUploadError("");
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("You must be signed in to upload a resume.");

      const url = await uploadResume(file, user.id);
      onResumeUrlChange(url);
      setFileName(file.name);

      const note = `\n\n[Resume uploaded: ${file.name}]`;
      if (!context.includes(note.trim())) {
        onContextChange(context + note);
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function clearResume() {
    onResumeUrlChange(null);
    setFileName(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <section>
      <h1 className="text-2xl font-semibold tracking-tight text-on-surface sm:text-3xl">
        Provide more context
      </h1>
      <p className="mt-2 text-on-surface-variant">
        Write about yourself or anything you&apos;d like to share so we can know you better.
      </p>
      <div className="mt-8 space-y-8">
        <div className="flex flex-col gap-2">
          <label
            htmlFor="context"
            className="text-xs font-semibold uppercase tracking-wider text-on-surface"
          >
            About You
          </label>
          <Textarea
            id="context"
            value={context}
            onChange={(e) => onContextChange(e.target.value)}
            placeholder="Your background, projects, goals, or what you want the coach to know…"
            rows={4}
          />
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-on-surface">
            Upload Resume / CV
          </span>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.doc,.docx"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFileSelect(file);
            }}
          />
          {resumeUrl ? (
            <div className="flex items-center gap-3 rounded-lg border border-secondary bg-surface-container-low px-4 py-4">
              <CheckCircle className="h-8 w-8 shrink-0 text-success" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-on-surface">
                  {fileName ?? "Resume uploaded"}
                </p>
                <p className="text-sm text-on-surface-variant">Uploaded successfully</p>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={clearResume}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div
              role="button"
              tabIndex={0}
              onClick={() => fileRef.current?.click()}
              onKeyDown={(e) => e.key === "Enter" && fileRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                const file = e.dataTransfer.files[0];
                if (file) void handleFileSelect(file);
              }}
              className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-10 transition-colors ${
                dragOver
                  ? "border-secondary bg-surface-container-high"
                  : "border-outline-variant bg-white hover:bg-surface-container-low"
              }`}
            >
              <CloudUpload className="mb-4 h-10 w-10 text-outline-variant" />
              <p className="text-sm font-semibold text-on-surface">
                {uploading ? "Uploading…" : "Click to upload or drag and drop"}
              </p>
              <p className="mt-1 text-sm text-on-surface-variant">PDF, DOCX up to 10MB</p>
            </div>
          )}
          {uploadError && <p className="text-sm text-red-600">{uploadError}</p>}
        </div>
      </div>
    </section>
  );
}
