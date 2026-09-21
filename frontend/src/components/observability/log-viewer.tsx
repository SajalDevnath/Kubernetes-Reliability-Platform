import { Badge } from "@/components/ui/badge";
import type { LogEntry } from "@/lib/api/types";
import { formatCheckedAt } from "@/lib/metrics-format";
import { cn } from "@/lib/utils";

function levelBadgeVariant(level: string | null): "info" | "warning" | "destructive" | "muted" {
  const normalized = level?.toUpperCase() ?? "";
  if (normalized === "ERROR" || normalized === "CRITICAL" || normalized === "FATAL") {
    return "destructive";
  }
  if (normalized === "WARN" || normalized === "WARNING") {
    return "warning";
  }
  if (normalized === "INFO") {
    return "info";
  }
  return "muted";
}

function statusCodeClass(statusCode: number | null): string {
  if (statusCode === null) {
    return "text-muted-foreground";
  }
  if (statusCode >= 500) {
    return "text-destructive";
  }
  if (statusCode >= 400) {
    return "text-warning";
  }
  return "text-success";
}

interface LogViewerProps {
  logs: LogEntry[];
  className?: string;
}

export function LogViewer({ logs, className }: LogViewerProps) {
  return (
    <div className={cn("overflow-hidden rounded-lg border border-border", className)}>
      <ul className="divide-y divide-border">
        {logs.map((log, index) => (
          <li
            key={`${log.timestamp}-${index}`}
            className="bg-card/40 px-3 py-3 transition-colors hover:bg-card/70 sm:px-4"
          >
            <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:gap-4">
              <div className="flex shrink-0 flex-wrap items-center gap-2 lg:w-44 lg:flex-col lg:items-start">
                <time
                  dateTime={log.timestamp}
                  className="font-mono text-xs text-muted-foreground"
                >
                  {formatCheckedAt(log.timestamp)}
                </time>
                <Badge variant={levelBadgeVariant(log.level)} className="font-mono text-[10px]">
                  {log.level ?? "—"}
                </Badge>
              </div>

              <div className="min-w-0 flex-1 space-y-2">
                <p className="break-words text-sm leading-relaxed text-foreground">
                  {log.message}
                </p>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span>{log.service}</span>
                  {log.logger ? (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="truncate">{log.logger}</span>
                    </>
                  ) : null}
                  {log.method || log.path || log.status_code !== null ? (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono">
                        {log.method ?? "—"} {log.path ?? "—"}
                        {log.status_code !== null ? (
                          <span className={cn("ml-1", statusCodeClass(log.status_code))}>
                            {log.status_code}
                          </span>
                        ) : null}
                      </span>
                    </>
                  ) : null}
                </div>

                {log.trace_id || log.span_id ? (
                  <div className="flex flex-col gap-1 text-[11px] text-muted-foreground sm:flex-row sm:flex-wrap sm:gap-x-4">
                    {log.trace_id ? (
                      <span className="min-w-0 font-mono">
                        <span className="text-foreground/70">trace</span>{" "}
                        <span className="break-all">{log.trace_id}</span>
                      </span>
                    ) : null}
                    {log.span_id ? (
                      <span className="min-w-0 font-mono">
                        <span className="text-foreground/70">span</span>{" "}
                        <span className="break-all">{log.span_id}</span>
                      </span>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
