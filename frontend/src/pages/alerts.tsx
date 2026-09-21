import { AlertTriangle, Bell, Loader2, RefreshCw, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { FactTile } from "@/components/layout/fact-tile";
import { AlertDetailPanel } from "@/components/observability/alert-detail-panel";
import { AlertList } from "@/components/observability/alert-list";
import { LiveStatusIndicator } from "@/components/observability/live-status-indicator";
import { BackToTopButton } from "@/components/reliability/back-to-top-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePolling } from "@/hooks/use-polling";
import {
  countAlertsBySeverity,
  sortAlerts,
} from "@/lib/alerts-format";
import { getAlerts } from "@/lib/api/observability";
import type { Alert } from "@/lib/api/types";
import { formatCheckedAt, formatRelativeCheckedAt } from "@/lib/metrics-format";
import { POLL_INTERVALS } from "@/lib/observability-constants";

type SeverityFilter = "all" | "critical" | "warning";

function matchesAlertSearch(alert: Alert, query: string): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return true;
  }

  const fields = [
    alert.alert_name,
    alert.service,
    alert.summary,
    alert.description,
  ];

  return fields.some((field) => field?.toLowerCase().includes(normalized));
}

export function AlertsPage() {
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>("all");
  const [serviceFilter, setServiceFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFingerprint, setSelectedFingerprint] = useState<string | null>(null);

  const alertsPolling = usePolling(() => getAlerts(), POLL_INTERVALS.alerts);

  const sortedAlerts = useMemo(
    () => sortAlerts(alertsPolling.data?.alerts ?? []),
    [alertsPolling.data?.alerts],
  );

  const availableServices = useMemo(() => {
    const services = new Set<string>();
    for (const alert of sortedAlerts) {
      if (alert.service) {
        services.add(alert.service);
      }
    }
    return Array.from(services).sort();
  }, [sortedAlerts]);

  const filteredAlerts = useMemo(() => {
    return sortedAlerts.filter((alert) => {
      if (severityFilter !== "all" && alert.severity !== severityFilter) {
        return false;
      }
      if (serviceFilter !== "all" && alert.service !== serviceFilter) {
        return false;
      }
      return matchesAlertSearch(alert, searchQuery);
    });
  }, [sortedAlerts, severityFilter, serviceFilter, searchQuery]);

  const selectedAlert = useMemo(
    () =>
      sortedAlerts.find((alert) => alert.fingerprint === selectedFingerprint) ?? null,
    [sortedAlerts, selectedFingerprint],
  );

  const checkedAt = alertsPolling.data?.checked_at;
  const hasData = alertsPolling.data !== null;
  const showInitialLoading = alertsPolling.status === "loading" && !hasData;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8">
      <header className="space-y-4 border-b border-border pb-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <Badge variant="muted" className="font-mono text-[11px] uppercase tracking-wide">
              Live observability
            </Badge>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
              Alerts
            </h1>
            <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground md:text-base">
              Active alerts from Alertmanager via the read-only BFF. Alertmanager is the
              source of truth for current firing alert state — not alert history.
            </p>
          </div>
          <div className="space-y-2 text-sm">
            <LiveStatusIndicator status={alertsPolling.status} />
            {checkedAt ? (
              <p className="text-xs text-muted-foreground">
                Last updated {formatRelativeCheckedAt(checkedAt)} (
                {formatCheckedAt(checkedAt)})
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to="/reliability/services">Reliability Services</Link>
          </Button>
        </div>
      </header>

      {hasData ? (
        <section className="grid gap-4 sm:grid-cols-3">
          <FactTile
            label="Active alerts"
            value={String(sortedAlerts.length)}
            detail="Currently firing alerts reported by Alertmanager."
            icon={Bell}
          />
          <FactTile
            label="Critical"
            value={String(countAlertsBySeverity(sortedAlerts, "critical"))}
            detail="Alerts routed to the critical receiver."
            icon={AlertTriangle}
            className="border-destructive/20"
          />
          <FactTile
            label="Warning"
            value={String(countAlertsBySeverity(sortedAlerts, "warning"))}
            detail="Alerts routed to the warning receiver."
            icon={AlertTriangle}
            className="border-warning/20"
          />
        </section>
      ) : null}

      <section className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            Active alerts
          </h2>
          <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
            Firing alerts from Alertmanager, refreshed automatically.
          </p>
        </div>

        {showInitialLoading ? (
          <div className="flex items-center gap-2 rounded-lg border border-border bg-card/40 px-4 py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Loading alerts…
          </div>
        ) : null}

        {alertsPolling.status === "error" ? (
          <div className="flex flex-col gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-destructive">
              {alertsPolling.error ?? "Alerts unavailable"}
            </p>
            <Button variant="outline" size="sm" onClick={() => void alertsPolling.refresh()}>
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              Retry
            </Button>
          </div>
        ) : null}

        {hasData ? (
          <div className="space-y-6">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div className="relative w-full lg:max-w-md">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search alert name, service, summary, or description"
                  className="pl-9"
                  aria-label="Search alerts"
                />
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="flex items-center gap-2">
                  <label htmlFor="alerts-severity-filter" className="text-sm text-muted-foreground">
                    Severity
                  </label>
                  <select
                    id="alerts-severity-filter"
                    value={severityFilter}
                    onChange={(event) =>
                      setSeverityFilter(event.target.value as SeverityFilter)
                    }
                    className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                  >
                    <option value="all">All</option>
                    <option value="critical">Critical</option>
                    <option value="warning">Warning</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <label htmlFor="alerts-service-filter" className="text-sm text-muted-foreground">
                    Service
                  </label>
                  <select
                    id="alerts-service-filter"
                    value={serviceFilter}
                    onChange={(event) => setServiceFilter(event.target.value)}
                    className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                  >
                    <option value="all">All Services</option>
                    {availableServices.map((service) => (
                      <option key={service} value={service}>
                        {service}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {sortedAlerts.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-8 text-center">
                <p className="text-sm font-medium text-foreground">No active alerts</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Alertmanager reports no currently firing alerts.
                </p>
              </div>
            ) : null}

            {sortedAlerts.length > 0 && filteredAlerts.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
                No alerts match the current filters.
              </div>
            ) : null}

            {filteredAlerts.length > 0 ? (
              <AlertList
                alerts={filteredAlerts}
                selectedFingerprint={selectedFingerprint}
                onSelect={setSelectedFingerprint}
              />
            ) : null}

            {sortedAlerts.length > 0 ? (
              <p className="text-xs text-muted-foreground">
                Showing {filteredAlerts.length} of {sortedAlerts.length} active alerts
              </p>
            ) : null}
          </div>
        ) : null}
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            Alert details
          </h2>
        </div>
        <AlertDetailPanel alert={selectedAlert} />
      </section>

      <BackToTopButton />
    </div>
  );
}
