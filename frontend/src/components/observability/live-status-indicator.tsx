import type { PollingStatus } from "@/hooks/use-polling";
import { cn } from "@/lib/utils";

interface LiveStatusIndicatorProps {
  status: PollingStatus;
  className?: string;
}

export function LiveStatusIndicator({ status, className }: LiveStatusIndicatorProps) {
  if (status === "loading") {
    return null;
  }

  if (status === "error") {
    return (
      <div
        className={cn("flex items-center gap-2", className)}
        role="status"
        aria-live="polite"
        aria-label="Disconnected"
      >
        <span
          className="h-2 w-2 shrink-0 rounded-full bg-destructive"
          aria-hidden="true"
        />
        <span className="text-xs font-semibold uppercase tracking-wide text-destructive">
          Disconnected
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn("flex items-center gap-2", className)}
      role="status"
      aria-live="polite"
      aria-label="Live"
    >
      <span className="relative flex h-2 w-2 shrink-0" aria-hidden="true">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-50" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
      </span>
      <span className="text-xs font-semibold uppercase tracking-wide text-success">Live</span>
    </div>
  );
}
