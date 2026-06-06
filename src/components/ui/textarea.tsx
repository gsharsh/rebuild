import { cn } from "@/lib/utils";
import { TextareaHTMLAttributes, forwardRef } from "react";

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => {
  return (
    <textarea
      ref={ref}
      className={cn(
        "w-full resize-none rounded-lg border border-outline-variant bg-white px-4 py-3 text-sm text-on-surface outline-none transition-all placeholder:text-on-surface-variant/60 focus:ring-2 focus:ring-secondary focus:ring-offset-2 min-h-[100px]",
        className
      )}
      {...props}
    />
  );
});

Textarea.displayName = "Textarea";
