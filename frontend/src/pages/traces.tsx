import { ArrowRight, GitBranch, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { LiveStatusIndicator } from "@/components/observability/live-status-indicator";
import { MetricsSection } from "@/components/observability/metrics-section";
import { TraceDetailPanel } from "@/components/observability/trace-detail-panel";
import { TraceList } from "@/components/observability/trace-list";
import { BackToTopButton } from "@/components/reliability/back-to-top-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePolling } from "@/hooks/use-polling";
import { ApiError } from "@/lib/api/client";
import { getTrace, getTraces } from "@/lib/api/observability";
import type { MetricServiceFilter, TraceDetailResponse, TraceSummary } from "@/lib/api/types";
import { formatCheckedAt, formatRelativeCheckedAt } from "@/lib/metrics-format";
import {
  POLL_INTERVALS,
  TRACE_SERVICE_OPTIONS,
  TRACES_DEFAULT_LIMIT,
} from "@/lib/observability-constants";

function parseServiceFilter(value: string | null): MetricServiceFilter | "" {
  if (
    value === "user-service" ||
    value === "order-service" ||
    value === "payment-service"
  ) {
    return value;
  }
  return "";
}

function matchesTraceSearch(trace: TraceSummary, query: string): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return true;
  }

  const fields = [trace.trace_id, trace.service, trace.root_operation];
  return fields.some((field) => field?.toLowerCase().includes(normalized));
}

type TraceDetailState = {
  status: "idle" | "loading" | "success" | "error";
  data: TraceDetailResponse | null;
  error: string | null;
};

export function TracesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedService = parseServiceFilter(searchParams.get("service"));
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTraceId, setSelectedTraceId] = useState<string | null>(null);
  const [detailState, setDetailState] = useState<TraceDetailState>({
    status: "idle",
    data: null,
    error: null,
  });

  const setServiceFilter = useCallback(
    (service: MetricServiceFilter | "") => {
      const next = new URLSearchParams(searchParams);
      if (service) {
        next.set("service", service);
      } else {
        next.delete("service");
      }
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const tracesPolling = usePolling(
    () =>
      getTraces(
        selectedService ? selectedService : undefined,
        TRACES_DEFAULT_LIMIT,
      ),
    POLL_INTERVALS.traces,
    true,
    [selectedService],
  );

  const sortedTraces = useMemo(() => {
    const traces = tracesPolling.data?.traces ?? [];
    return [...traces].sort((left, right) => {
      const leftTime = left.start_time ?? "";
      const rightTime = right.start_time ?? "";
      return rightTime.localeCompare(leftTime);
    });
  }, [tracesPolling.data?.traces]);

  const filteredTraces = useMemo(
    () => sortedTraces.filter((trace) => matchesTraceSearch(trace, searchQuery)),
    [sortedTraces, searchQuery],
  );

  const loadTraceDetail = useCallback(async (traceId: string) => {
    setDetailState({ status: "loading", data: null, error: null });
    try {
      const data = await getTrace(traceId);
      setDetailState({ status: "success", data, error: null });
    } catch (error) {
      setDetailState({
        status: "error",
        data: null,
        error: error instanceof ApiError ? error.message : "Request failed",
      });
    }
  }, []);

  useEffect(() => {
    if (!selectedTraceId) {
      setDetailState({ status: "idle", data: null, error: null });
      return;
    }
    void loadTraceDetail(selectedTraceId);
  }, [selectedTraceId, loadTraceDetail]);

  const checkedAt = tracesPolling.data?.checked_at;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8">
      <header className="space-y-4 border-b border-border pb-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <Badge variant="muted" className="font-mono text-[11px] uppercase tracking-wide">
              Live observability
            </Badge>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
              Traces
            </h1>
            <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground md:text-base">
              Live distributed traces from Tempo via the read-only BFF. Trace search is
              scoped to curated service selectors — not arbitrary TraceQL from the browser.
            </p>
          </div>
          <div className="space-y-2 text-sm">
            <LiveStatusIndicator status={tracesPolling.status} />
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
            <label htmlFor="traces-service-filter" className="text-sm text-muted-foreground">
              Service filter
            </label>
            <select
              id="traces-service-filter"
              value={selectedService}
              onChange={(event) =>
                setServiceFilter(event.target.value as MetricServiceFilter | "")
              }
              className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
            >
              {TRACE_SERVICE_OPTIONS.map((option) => (
                <option key={option.label} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedService ? (
              <>
                <Button variant="outline" size="sm" asChild>
                  <Link to={`/observability/metrics?service=${selectedService}`}>
                    Metrics
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link to={`/observability/logs?service=${selectedService}`}>
                    Logs
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                </Button>
              </>
            ) : null}
            <Button variant="outline" size="sm" asChild>
              <Link to="/reliability/services">Reliability Services</Link>
            </Button>
          </div>
        </div>
      </header>

      <MetricsSection
        title="Live traces"
        description="Recent traces from Tempo, refreshed automatically."
        status={tracesPolling.status}
        error={tracesPolling.error}
        checkedAt={tracesPolling.data?.checked_at}
        onRetry={tracesPolling.refresh}
        loadingMessage="Loading traces…"
      >
        <div className="space-y-6">
          <div className="relative w-full lg:max-w-md">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Filter by trace ID, service, or root operation"
              className="pl-9"
              aria-label="Filter traces"
            />
          </div>

          {tracesPolling.data && tracesPolling.data.traces.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
              {selectedService
                ? "No traces found for the selected service."
                : "No traces found."}
            </div>
          ) : null}

          {tracesPolling.data &&
          tracesPolling.data.traces.length > 0 &&
          filteredTraces.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
              No traces match the current filters.
            </div>
          ) : null}

          {filteredTraces.length > 0 ? (
            <TraceList
              traces={filteredTraces}
              selectedTraceId={selectedTraceId}
              onSelect={setSelectedTraceId}
            />
          ) : null}

          {tracesPolling.data ? (
            <p className="text-xs text-muted-foreground">
              Showing {filteredTraces.length} of {tracesPolling.data.traces.length} traces
              (limit {tracesPolling.data.limit})
            </p>
          ) : null}
        </div>
      </MetricsSection>

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <GitBranch className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            Trace inspection
          </h2>
        </div>
        <TraceDetailPanel
          status={detailState.status}
          data={detailState.data}
          error={detailState.error}
          onRetry={
            selectedTraceId
              ? () => {
                  void loadTraceDetail(selectedTraceId);
                }
              : undefined
          }
        />
      </section>

      <BackToTopButton />
    </div>
  );
}
