import { cn } from "@/lib/utils";

type StatusVariant = "neutral" | "info" | "success" | "warning" | "critical";

const variantStyles: Record<StatusVariant, string> = {
  neutral: "bg-muted-foreground",
  info: "bg-info",
  success: "bg-success",
  warning: "bg-warning",
  critical: "bg-destructive",
};

interface StatusIndicatorProps {
  variant?: StatusVariant;
  label: string;
  className?: string;
}

export function StatusIndicator({
  variant = "neutral",
  label,
  className,
}: StatusIndicatorProps) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-sm", className)}>
      <span
        className={cn("h-2 w-2 shrink-0 rounded-full", variantStyles[variant])}
        aria-hidden="true"
      />
      <span className="text-muted-foreground">{label}</span>
    </span>
  );
}
