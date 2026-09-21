import {
  Activity,
  ArrowRight,
  BarChart3,
  Database,
  ExternalLink,
  Gauge,
  Target,
} from "lucide-react";
import { useCallback, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { LiveStatusIndicator } from "@/components/observability/live-status-indicator";
import { MetricsSection } from "@/components/observability/metrics-section";
import { TimeSeriesMetricCard } from "@/components/observability/time-series-metric-card";
import { BackToTopButton } from "@/components/reliability/back-to-top-button";
import { SectionHeader } from "@/components/layout/section-header";
import { StatusIndicator } from "@/components/layout/status-indicator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { usePolling } from "@/hooks/use-polling";
import {
  getObservabilityHealth,
  getPostgresMetrics,
  getRequestMetrics,
  getServiceHealth,
  getSloMetrics,
} from "@/lib/api/observability";
import type { MetricServiceFilter, ObservabilityHealthStatus } from "@/lib/api/types";
import {
  formatAvailabilityRatio,
  formatBytes,
  formatCheckedAt,
  formatErrorBudgetRatio,
  formatErrorRateRatio,
  formatLatencySeconds,
  formatRelativeCheckedAt,
  formatRequestRate,
  getLatestNumericValue,
} from "@/lib/metrics-format";
import {
  GRAFANA_LINKS,
  METRIC_SERVICE_OPTIONS,
  POLL_INTERVALS,
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

function healthStatusVariant(
  status: ObservabilityHealthStatus,
): "success" | "warning" | "destructive" {
  if (status === "healthy") {
    return "success";
  }
  if (status === "degraded") {
    return "warning";
  }
  return "destructive";
}

function complianceBadge(compliant: boolean | null) {
  if (compliant === null) {
    return { label: "No data", variant: "muted" as const };
  }
  if (compliant) {
    return { label: "Compliant", variant: "success" as const };
  }
  return { label: "Violation", variant: "destructive" as const };
}

function boolStatusLabel(value: boolean | null): { label: string; variant: "success" | "critical" | "neutral" } {
  if (value === true) {
    return { label: "UP", variant: "success" };
  }
  if (value === false) {
    return { label: "DOWN", variant: "critical" };
  }
  return { label: "No data", variant: "neutral" };
}

export function MetricsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedService = parseServiceFilter(searchParams.get("service"));

  const setSelectedService = useCallback(
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

  const observabilityHealth = usePolling(
    getObservabilityHealth,
    POLL_INTERVALS.observabilityHealth,
  );
  const serviceHealth = usePolling(getServiceHealth, POLL_INTERVALS.serviceHealth);
  const requestMetrics = usePolling(
    () =>
      getRequestMetrics(
        selectedService ? { service: selectedService } : undefined,
      ),
    POLL_INTERVALS.requestMetrics,
    true,
    [selectedService],
  );
  const postgresMetrics = usePolling(getPostgresMetrics, POLL_INTERVALS.postgres);
  const sloMetrics = usePolling(
    () => getSloMetrics(selectedService as MetricServiceFilter),
    POLL_INTERVALS.slo,
    Boolean(selectedService),
    [selectedService],
  );

  const requestRateValue = useMemo(
    () =>
      requestMetrics.data
        ? getLatestNumericValue(requestMetrics.data.series.request_rate)
        : null,
    [requestMetrics.data],
  );
  const errorRateValue = useMemo(
    () =>
      requestMetrics.data
        ? getLatestNumericValue(requestMetrics.data.series.error_rate_5xx)
        : null,
    [requestMetrics.data],
  );
  const latencyValue = useMemo(
    () =>
      requestMetrics.data
        ? getLatestNumericValue(requestMetrics.data.series.latency_p95_seconds)
        : null,
    [requestMetrics.data],
  );

  const latestCheckedAt = [
    serviceHealth.data?.checked_at,
    requestMetrics.data?.checked_at,
    postgresMetrics.data?.checked_at,
    sloMetrics.data?.checked_at,
  ]
    .filter(Boolean)
    .sort()
    .at(-1);

  const componentMap = new Map(
    observabilityHealth.data?.components.map((component) => [
      component.name,
      component,
    ]) ?? [],
  );

  const availabilityBadge = complianceBadge(
    sloMetrics.data?.availability.compliant ?? null,
  );
  const latencyBadge = complianceBadge(sloMetrics.data?.latency.compliant ?? null);
  const postgresStatus = boolStatusLabel(postgresMetrics.data?.postgres.up ?? null);
  const exporterStatus = boolStatusLabel(postgresMetrics.data?.exporter.up ?? null);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8">
      <header className="space-y-4 border-b border-border pb-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <Badge variant="muted" className="font-mono text-[11px] uppercase tracking-wide">
              Live observability
            </Badge>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
              Metrics
            </h1>
            <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground md:text-base">
              Live reliability signals from the KRP observability stack via the
              read-only BFF. Values are sourced from Prometheus recording rules and
              scrape targets — not fabricated UI placeholders.
            </p>
          </div>
          <div className="space-y-2 text-sm">
            <LiveStatusIndicator status={requestMetrics.status} />
            {latestCheckedAt ? (
              <p className="text-xs text-muted-foreground">
                Last updated {formatRelativeCheckedAt(latestCheckedAt)} (
                {formatCheckedAt(latestCheckedAt)})
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <label htmlFor="service-filter" className="text-sm text-muted-foreground">
              Service filter
            </label>
            <select
              id="service-filter"
              value={selectedService}
              onChange={(event) =>
                setSelectedService(event.target.value as MetricServiceFilter | "")
              }
              className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
            >
              {METRIC_SERVICE_OPTIONS.map((option) => (
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
                  <Link to={`/observability/logs?service=${selectedService}`}>
                    Logs
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link to={`/observability/traces?service=${selectedService}`}>
                    Traces
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                </Button>
              </>
            ) : null}
            <Button variant="outline" size="sm" asChild>
              <Link to="/reliability/services">Reliability Services</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/reliability/slo">Reliability SLOs</Link>
            </Button>
          </div>
        </div>
      </header>

      <MetricsSection
        title="Observability health"
        description="Upstream readiness for the BFF and observability backends."
        status={observabilityHealth.status}
        error={observabilityHealth.error}
        checkedAt={observabilityHealth.data?.checked_at}
        onRetry={observabilityHealth.refresh}
      >
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant={healthStatusVariant(observabilityHealth.data?.status ?? "unhealthy")}>
            {observabilityHealth.data?.status ?? "unknown"}
          </Badge>
          {(["bff", "prometheus", "loki", "tempo", "alertmanager"] as const).map((name) => {
            const component = componentMap.get(name);
            const isUp = component?.status === "up";
            return (
              <StatusIndicator
                key={name}
                variant={isUp ? "success" : "critical"}
                label={`${name}${component?.latency_ms ? ` · ${component.latency_ms}ms` : ""}`}
              />
            );
          })}
        </div>
      </MetricsSection>

      <MetricsSection
        title="Service availability"
        description="Prometheus scrape health for KRP application services."
        status={serviceHealth.status}
        error={serviceHealth.error}
        checkedAt={serviceHealth.data?.checked_at}
        onRetry={serviceHealth.refresh}
      >
        <div className="grid gap-3 md:grid-cols-3">
          {serviceHealth.data?.services.map((service) => (
            <Card key={service.service} className="bg-card/60">
              <CardHeader className="space-y-2 pb-2">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base">{service.service}</CardTitle>
                  <StatusIndicator
                    variant={service.up ? "success" : "critical"}
                    label={service.up ? "UP" : "DOWN"}
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>
                  <span className="text-foreground">Instance:</span>{" "}
                  {service.instance ?? "No scrape target"}
                </p>
                <p>
                  <span className="text-foreground">Job:</span> {service.job}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </MetricsSection>

      <MetricsSection
        title="Traffic & performance"
        description="HTTP request rate, 5xx error rate, and P95 latency from Prometheus."
        status={requestMetrics.status}
        error={requestMetrics.error}
        checkedAt={requestMetrics.data?.checked_at}
        onRetry={requestMetrics.refresh}
      >
        <div className="grid gap-4 lg:grid-cols-3">
          <TimeSeriesMetricCard
            label="Request rate"
            detail="Latest value from the selected window"
            formattedValue={formatRequestRate(requestRateValue)}
            series={requestMetrics.data?.series.request_rate ?? []}
          />
          <TimeSeriesMetricCard
            label="5xx error rate"
            detail="Ratio of 5xx responses to total requests"
            formattedValue={formatErrorRateRatio(errorRateValue)}
            series={requestMetrics.data?.series.error_rate_5xx ?? []}
            warningValue={errorRateValue !== null && errorRateValue > 0}
          />
          <TimeSeriesMetricCard
            label="P95 latency"
            detail="95th percentile request duration"
            formattedValue={formatLatencySeconds(latencyValue)}
            series={requestMetrics.data?.series.latency_p95_seconds ?? []}
          />
        </div>
      </MetricsSection>

      <MetricsSection
        title="PostgreSQL"
        description="Database and postgres-exporter health from Prometheus."
        status={postgresMetrics.status}
        error={postgresMetrics.error}
        checkedAt={postgresMetrics.data?.checked_at}
        onRetry={postgresMetrics.refresh}
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card className="bg-card/60">
            <CardContent className="space-y-2 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                PostgreSQL health
              </p>
              <StatusIndicator
                variant={postgresStatus.variant}
                label={postgresStatus.label}
              />
              <p className="text-sm text-muted-foreground">
                Database: {postgresMetrics.data?.postgres.datname ?? "k8s_reliability"}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-card/60">
            <CardContent className="space-y-2 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Exporter health
              </p>
              <StatusIndicator
                variant={exporterStatus.variant}
                label={exporterStatus.label}
              />
              <p className="text-sm text-muted-foreground">
                {postgresMetrics.data?.exporter.instance ?? "No exporter instance"}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-card/60">
            <CardContent className="space-y-2 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Connections
              </p>
              <p className="text-2xl font-semibold text-foreground">
                {postgresMetrics.data?.connections ?? "No data"}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-card/60">
            <CardContent className="space-y-2 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Database size
              </p>
              <p className="text-2xl font-semibold text-foreground">
                {formatBytes(postgresMetrics.data?.database_size_bytes ?? null)}
              </p>
            </CardContent>
          </Card>
        </div>
      </MetricsSection>

      <section className="space-y-4">
        <SectionHeader
          title="Live SLO"
          description={
            selectedService
              ? `Recording-rule SLI/SLO values for ${selectedService}.`
              : "Select a specific service to load live SLO metrics."
          }
        />
        {!selectedService ? (
          <div className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-8 text-sm text-muted-foreground">
            Choose User, Order, or Payment Service to view live SLO measurements.
          </div>
        ) : (
          <MetricsSection
            title="SLO measurements"
            status={sloMetrics.status}
            error={sloMetrics.error}
            checkedAt={sloMetrics.data?.checked_at}
            onRetry={sloMetrics.refresh}
          >
            <div className="grid gap-4 lg:grid-cols-3">
              <Card className="bg-card/60">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Target className="h-4 w-4" aria-hidden="true" />
                    Availability
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">SLI</span>
                    <span className="font-medium text-foreground">
                      {formatAvailabilityRatio(sloMetrics.data?.availability.sli ?? null)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">Target</span>
                    <span className="font-medium text-foreground">
                      {formatAvailabilityRatio(sloMetrics.data?.availability.target ?? null)}
                    </span>
                  </div>
                  <Badge variant={availabilityBadge.variant}>{availabilityBadge.label}</Badge>
                </CardContent>
              </Card>

              <Card className="bg-card/60">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Gauge className="h-4 w-4" aria-hidden="true" />
                    Error budget
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">Remaining</span>
                    <span className="font-medium text-foreground">
                      {formatErrorBudgetRatio(
                        sloMetrics.data?.availability.error_budget_remaining ?? null,
                      )}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">Consumed</span>
                    <span className="font-medium text-foreground">
                      {formatErrorBudgetRatio(
                        sloMetrics.data?.availability.error_budget_consumed ?? null,
                      )}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card/60">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Activity className="h-4 w-4" aria-hidden="true" />
                    Latency
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">P95</span>
                    <span className="font-medium text-foreground">
                      {formatLatencySeconds(sloMetrics.data?.latency.p95_seconds ?? null)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">Target</span>
                    <span className="font-medium text-foreground">
                      {formatLatencySeconds(sloMetrics.data?.latency.target_seconds ?? null)}
                    </span>
                  </div>
                  <Badge variant={latencyBadge.variant}>{latencyBadge.label}</Badge>
                </CardContent>
              </Card>
            </div>

            <Card className="bg-card/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Diagnostics</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 text-sm md:grid-cols-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">5xx ratio</span>
                  <span className="font-medium text-foreground">
                    {formatErrorRateRatio(
                      sloMetrics.data?.diagnostics.error_rate_5xx_ratio ?? null,
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">Request rate (5m)</span>
                  <span className="font-medium text-foreground">
                    {formatRequestRate(sloMetrics.data?.diagnostics.request_rate_5m ?? null)}
                  </span>
                </div>
              </CardContent>
            </Card>
          </MetricsSection>
        )}
      </section>

      <section className="rounded-lg border border-border bg-card/40 px-4 py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <BarChart3 className="h-4 w-4" aria-hidden="true" />
              Advanced exploration
            </div>
            <p className="text-sm text-muted-foreground">
              Grafana remains the advanced investigation interface. Port-forward to
              localhost:3000 when working against kind.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <a href={GRAFANA_LINKS.services} target="_blank" rel="noreferrer">
                Open in Grafana
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href={GRAFANA_LINKS.sre} target="_blank" rel="noreferrer">
                SRE dashboard
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href={GRAFANA_LINKS.postgres} target="_blank" rel="noreferrer">
                <Database className="h-3.5 w-3.5" aria-hidden="true" />
                Postgres dashboard
              </a>
            </Button>
          </div>
        </div>
      </section>

      <BackToTopButton />
    </div>
  );
}
