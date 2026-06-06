import { cn } from "@/lib/utils";
import { InputHTMLAttributes, forwardRef } from "react";

export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => {
  return (
    <input
      ref={ref}
      className={cn(
        "w-full rounded-lg border border-outline-variant bg-white px-4 py-3 text-sm text-on-surface outline-none transition-all placeholder:text-on-surface-variant/60 focus:ring-2 focus:ring-secondary focus:ring-offset-2",
        className
      )}
      {...props}
    />
  );
});

Input.displayName = "Input";
