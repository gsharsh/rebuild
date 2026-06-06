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
        "rounded-xl border px-4 py-3",
        {
          "border-border bg-white": variant === "default",
          "border-brand-200 bg-brand-50": variant === "accent",
          "border-border bg-gray-50": variant === "muted",
        },
        className
      )}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 text-xl font-semibold text-gray-900">{value}</p>
      {sublabel && <p className="mt-0.5 text-xs text-muted">{sublabel}</p>}
    </div>
  );
}
