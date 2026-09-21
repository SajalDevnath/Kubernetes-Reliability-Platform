import { ExternalLink } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Alert } from "@/lib/api/types";
import {
  formatSeverityLabel,
  severityBadgeVariant,
} from "@/lib/alerts-format";
import { formatCheckedAt, formatTraceTimestamp } from "@/lib/metrics-format";

interface AlertDetailPanelProps {
  alert: Alert | null;
}

function KeyValueList({ items }: { items: Record<string, string> }) {
  const entries = Object.entries(items).sort(([left], [right]) =>
    left.localeCompare(right),
  );

  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">None</p>;
  }

  return (
    <dl className="grid gap-2 text-sm">
      {entries.map(([key, value]) => (
        <div key={key} className="grid gap-1 sm:grid-cols-[minmax(0,12rem)_1fr]">
          <dt className="font-mono text-xs text-muted-foreground">{key}</dt>
          <dd className="break-all text-foreground">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function AlertDetailPanel({ alert }: AlertDetailPanelProps) {
  if (!alert) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
        Select an alert to inspect its details.
      </div>
    );
  }

  return (
    <Card className="bg-card/60">
      <CardHeader className="space-y-3 pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className="text-base">{alert.alert_name}</CardTitle>
          <Badge variant={severityBadgeVariant(alert.severity)}>
            {formatSeverityLabel(alert.severity)}
          </Badge>
        </div>
        <div className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Status</p>
            <p className="text-foreground">{alert.status}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Service</p>
            <p className="text-foreground">{alert.service ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Job</p>
            <p className="text-foreground">{alert.job ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Instance</p>
            <p className="break-all font-mono text-xs text-foreground">
              {alert.instance ?? "—"}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Started at</p>
            <p className="text-foreground">
              {alert.starts_at
                ? `${formatTraceTimestamp(alert.starts_at)} (${formatCheckedAt(alert.starts_at)})`
                : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Generator URL
            </p>
            {alert.generator_url ? (
              <a
                href={alert.generator_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 break-all text-primary hover:underline"
              >
                Open in Prometheus
                <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              </a>
            ) : (
              <p className="text-foreground">—</p>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-foreground">Summary</h3>
          <p className="text-sm text-muted-foreground">{alert.summary ?? "—"}</p>
        </div>
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-foreground">Description</h3>
          <p className="text-sm text-muted-foreground">{alert.description ?? "—"}</p>
        </div>
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-foreground">Labels</h3>
          <KeyValueList items={alert.labels} />
        </div>
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-foreground">Annotations</h3>
          <KeyValueList items={alert.annotations} />
        </div>
      </CardContent>
    </Card>
  );
}
