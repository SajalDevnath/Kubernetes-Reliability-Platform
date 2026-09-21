import { AlertCircle, Loader2, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PollingStatus } from "@/hooks/use-polling";

interface MetricsSectionProps {
  title: string;
  description?: string;
  status: PollingStatus;
  error?: string | null;
  checkedAt?: string;
  onRetry?: () => void;
  loadingMessage?: string;
  children: React.ReactNode;
  className?: string;
}

export function MetricsSection({
  title,
  description,
  status,
  error,
  checkedAt,
  onRetry,
  loadingMessage = "Loading metrics…",
  children,
  className,
}: MetricsSectionProps) {
  return (
    <section className={cn("space-y-4", className)}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold tracking-tight text-foreground">{title}</h2>
          {description ? (
            <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
        {checkedAt ? (
          <p className="text-xs text-muted-foreground">
            Updated {new Date(checkedAt).toLocaleTimeString()}
          </p>
        ) : null}
      </div>

      {status === "loading" ? (
        <div className="flex items-center gap-2 rounded-lg border border-border bg-card/40 px-4 py-8 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          {loadingMessage}
        </div>
      ) : null}

      {status === "error" ? (
        <div className="flex flex-col gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{error ?? "Metrics unavailable"}</span>
          </div>
          {onRetry ? (
            <Button variant="outline" size="sm" onClick={() => void onRetry()}>
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              Retry
            </Button>
          ) : null}
        </div>
      ) : null}

      {status === "success" ? children : null}
    </section>
  );
}
