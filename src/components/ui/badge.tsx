import { cn } from "@/lib/utils";

export function Badge({
  children,
  variant = "default",
  className,
}: {
  children: React.ReactNode;
  variant?: "default" | "success" | "warning" | "info";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-semibold",
        {
          "bg-surface-container-low text-on-surface-variant": variant === "default",
          "bg-green-50 text-success": variant === "success",
          "bg-amber-50 text-amber-800": variant === "warning",
          "bg-surface-container-low text-secondary": variant === "info",
        },
        className
      )}
    >
      {children}
    </span>
  );
}
