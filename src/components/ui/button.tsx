import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-lg font-medium transition-all disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]",
          {
            "bg-primary-action text-white hover:opacity-90 shadow-sm":
              variant === "primary",
            "bg-white text-on-surface border border-outline-variant hover:bg-surface-container-low":
              variant === "secondary",
            "text-on-surface-variant hover:bg-surface-container-low":
              variant === "ghost",
            "bg-red-600 text-white hover:bg-red-700": variant === "danger",
            "px-3 py-1.5 text-sm": size === "sm",
            "px-4 py-2 text-sm": size === "md",
            "px-6 py-3 text-base": size === "lg",
          },
          className
        )}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";
