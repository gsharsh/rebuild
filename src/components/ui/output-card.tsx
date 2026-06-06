import { cn } from "@/lib/utils";

interface OutputCardProps {
  title: string;
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
}

export function OutputCard({ title, children, className, action }: OutputCardProps) {
  return (
    <div className={cn("rounded-xl border border-border bg-white shadow-sm", className)}>
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        {action}
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}
