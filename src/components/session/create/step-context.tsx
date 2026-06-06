"use client";

import { useRef, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { uploadResume } from "@/lib/supabase/storage";
import { createClient } from "@/lib/supabase/client";
import { getPurposeCopy } from "@/lib/purpose-copy";
import { FileText, Upload, X } from "lucide-react";

interface StepContextProps {
  interviewType: string;
  context: string;
  onContextChange: (value: string) => void;
  resumeUrl: string | null;
  onResumeUrlChange: (url: string | null) => void;
}

export function StepContext({
  interviewType,
  context,
  onContextChange,
  resumeUrl,
  onResumeUrlChange,
}: StepContextProps) {
  const copy = getPurposeCopy(interviewType);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);

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
    <div>
      <h2 className="text-lg font-semibold text-gray-900">{copy.contextTitle}</h2>
      <p className="mt-1 text-sm text-muted">
        {copy.contextDescription}
      </p>
      <div className="mt-6 space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            {copy.contextLabel}
          </label>
          <Textarea
            value={context}
            onChange={(e) => onContextChange(e.target.value)}
            placeholder={copy.contextPlaceholder}
            rows={6}
          />
        </div>

        {copy.showResumeUpload && (
          <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Resume (optional)
          </label>
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
            <div className="flex items-center gap-3 rounded-lg border border-brand-200 bg-brand-50 px-4 py-3">
              <FileText className="h-5 w-5 text-brand-600" />
              <span className="flex-1 truncate text-sm text-brand-800">
                {fileName ?? "Resume uploaded"}
              </span>
              <Button type="button" variant="ghost" size="sm" onClick={clearResume}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              variant="secondary"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
            >
              <Upload className="mr-2 h-4 w-4" />
              {uploading ? "Uploading…" : "Upload resume"}
            </Button>
          )}
          {uploadError && (
            <p className="mt-2 text-sm text-red-600">{uploadError}</p>
          )}
          </div>
        )}
      </div>
    </div>
  );
}
