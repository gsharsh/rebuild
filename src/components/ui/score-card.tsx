import { cn } from "@/lib/utils";

interface ScoreCardProps {
  label: string;
  value: string | number;
  sublabel?: string;
  variant?: "default" | "accent" | "muted";
  className?: string;
}

export function ScoreCard({
  label,
  value,
  sublabel,
  variant = "default",
  className,
}: ScoreCardProps) {
  return (
    <div
      className={cn(
        "rounded-lg border px-4 py-3",
        {
          "border-outline-variant bg-surface-elevated": variant === "default",
          "border-secondary bg-surface-container-low": variant === "accent",
          "border-outline-variant bg-surface-container-low": variant === "muted",
        },
        className
      )}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
        {label}
      </p>
      <p className="mt-1 text-xl font-semibold text-on-surface">{value}</p>
      {sublabel && (
        <p className="mt-0.5 text-xs text-on-surface-variant">{sublabel}</p>
      )}
    </div>
  );
}
