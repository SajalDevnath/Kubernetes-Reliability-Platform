import { ArrowRight, FileText, Search } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { LiveStatusIndicator } from "@/components/observability/live-status-indicator";
import { LogViewer } from "@/components/observability/log-viewer";
import { MetricsSection } from "@/components/observability/metrics-section";
import { PlaceholderState } from "@/components/layout/placeholder-state";
import { BackToTopButton } from "@/components/reliability/back-to-top-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePolling } from "@/hooks/use-polling";
import { getLogs } from "@/lib/api/observability";
import type { LogEntry, MetricServiceFilter } from "@/lib/api/types";
import { formatCheckedAt, formatRelativeCheckedAt } from "@/lib/metrics-format";
import {
  LOG_SERVICE_OPTIONS,
  LOGS_DEFAULT_LIMIT,
  POLL_INTERVALS,
} from "@/lib/observability-constants";

function parseServiceFilter(value: string | null): MetricServiceFilter | null {
  if (
    value === "user-service" ||
    value === "order-service" ||
    value === "payment-service"
  ) {
    return value;
  }
  return null;
}

function matchesSearch(log: LogEntry, query: string): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return true;
  }

  const fields = [
    log.message,
    log.path,
    log.logger,
    log.trace_id,
    log.span_id,
  ];

  return fields.some((field) => field?.toLowerCase().includes(normalized));
}

export function LogsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedService = parseServiceFilter(searchParams.get("service"));
  const [searchQuery, setSearchQuery] = useState("");
  const [levelFilter, setLevelFilter] = useState<string>("all");

  const setSelectedService = useCallback(
    (service: MetricServiceFilter) => {
      const next = new URLSearchParams(searchParams);
      next.set("service", service);
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const logsPolling = usePolling(
    () => getLogs(selectedService as MetricServiceFilter, LOGS_DEFAULT_LIMIT),
    POLL_INTERVALS.logs,
    Boolean(selectedService),
    [selectedService],
  );

  const availableLevels = useMemo(() => {
    const levels = new Set<string>();
    for (const log of logsPolling.data?.logs ?? []) {
      if (log.level) {
        levels.add(log.level.toUpperCase());
      }
    }
    return Array.from(levels).sort();
  }, [logsPolling.data?.logs]);

  const filteredLogs = useMemo(() => {
    const logs = logsPolling.data?.logs ?? [];
    return logs.filter((log) => {
      if (levelFilter !== "all") {
        const logLevel = log.level?.toUpperCase() ?? "";
        if (logLevel !== levelFilter) {
          return false;
        }
      }
      return matchesSearch(log, searchQuery);
    });
  }, [logsPolling.data?.logs, levelFilter, searchQuery]);

  const checkedAt = logsPolling.data?.checked_at;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8">
      <header className="space-y-4 border-b border-border pb-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <Badge variant="muted" className="font-mono text-[11px] uppercase tracking-wide">
              Live observability
            </Badge>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
              Logs
            </h1>
            <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground md:text-base">
              Live application logs from Loki via the read-only BFF. Logs are scoped to
              curated service selectors — not arbitrary LogQL from the browser.
            </p>
          </div>
          <div className="space-y-2 text-sm">
            {selectedService ? (
              <LiveStatusIndicator status={logsPolling.status} />
            ) : null}
            {checkedAt ? (
              <p className="text-xs text-muted-foreground">
                Last updated {formatRelativeCheckedAt(checkedAt)} (
                {formatCheckedAt(checkedAt)})
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <label htmlFor="logs-service-filter" className="text-sm text-muted-foreground">
              Service
            </label>
            <select
              id="logs-service-filter"
              value={selectedService ?? ""}
              onChange={(event) =>
                setSelectedService(event.target.value as MetricServiceFilter)
              }
              className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
            >
              <option value="" disabled>
                Select a service
              </option>
              {LOG_SERVICE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedService ? (
              <Button variant="outline" size="sm" asChild>
                <Link to={`/observability/metrics?service=${selectedService}`}>
                  Metrics
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              </Button>
            ) : null}
            <Button variant="outline" size="sm" asChild>
              <Link to="/reliability/services">Reliability Services</Link>
            </Button>
          </div>
        </div>
      </header>

      {!selectedService ? (
        <PlaceholderState
          icon={FileText}
          badge="Service required"
          title="Select a service to view logs"
          description="Choose User, Order, or Payment Service to load live logs from Loki. You can also navigate here from the Metrics page with a service already selected."
        />
      ) : (
        <MetricsSection
          title={`Live logs · ${selectedService}`}
          description="Recent logs from the last 15 minutes, refreshed automatically."
          status={logsPolling.status}
          error={logsPolling.error}
          checkedAt={logsPolling.data?.checked_at}
          onRetry={logsPolling.refresh}
          loadingMessage="Loading logs…"
        >
          <div className="space-y-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div className="relative w-full lg:max-w-md">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Filter by message, path, logger, or trace ID"
                  className="pl-9"
                  aria-label="Filter logs"
                />
              </div>
              {availableLevels.length > 0 ? (
                <div className="flex items-center gap-2">
                  <label htmlFor="logs-level-filter" className="text-sm text-muted-foreground">
                    Level
                  </label>
                  <select
                    id="logs-level-filter"
                    value={levelFilter}
                    onChange={(event) => setLevelFilter(event.target.value)}
                    className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                  >
                    <option value="all">All levels</option>
                    {availableLevels.map((level) => (
                      <option key={level} value={level}>
                        {level}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
            </div>

            {logsPolling.data && logsPolling.data.logs.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
                No logs found for this service in the last 15 minutes.
              </div>
            ) : null}

            {logsPolling.data && logsPolling.data.logs.length > 0 && filteredLogs.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
                No logs match the current filters.
              </div>
            ) : null}

            {filteredLogs.length > 0 ? <LogViewer logs={filteredLogs} /> : null}

            {logsPolling.data ? (
              <p className="text-xs text-muted-foreground">
                Showing {filteredLogs.length} of {logsPolling.data.logs.length} logs
                (limit {logsPolling.data.limit})
              </p>
            ) : null}
          </div>
        </MetricsSection>
      )}

      <BackToTopButton />
    </div>
  );
}
