import { Badge } from "@/components/ui/badge";
import type { Alert } from "@/lib/api/types";
import {
  formatSeverityLabel,
  severityBadgeVariant,
} from "@/lib/alerts-format";
import { formatTraceTimestamp } from "@/lib/metrics-format";
import { cn } from "@/lib/utils";

interface AlertListProps {
  alerts: Alert[];
  selectedFingerprint: string | null;
  onSelect: (fingerprint: string) => void;
}

export function AlertList({ alerts, selectedFingerprint, onSelect }: AlertListProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b border-border bg-muted/30 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Severity</th>
              <th className="px-4 py-3 font-medium">Alert</th>
              <th className="px-4 py-3 font-medium">Service</th>
              <th className="px-4 py-3 font-medium">Summary</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Started</th>
              <th className="px-4 py-3 font-medium">Instance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {alerts.map((alert) => {
              const isSelected = alert.fingerprint === selectedFingerprint;
              return (
                <tr
                  key={alert.fingerprint}
                  className={cn(
                    "cursor-pointer transition-colors hover:bg-card/70",
                    isSelected && "bg-primary/10",
                    alert.severity === "critical" && "border-l-2 border-l-destructive",
                    alert.severity === "warning" && "border-l-2 border-l-warning",
                  )}
                  onClick={() => onSelect(alert.fingerprint)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onSelect(alert.fingerprint);
                    }
                  }}
                  tabIndex={0}
                  aria-selected={isSelected}
                >
                  <td className="px-4 py-3">
                    <Badge variant={severityBadgeVariant(alert.severity)}>
                      {formatSeverityLabel(alert.severity)}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 font-medium text-foreground">
                    {alert.alert_name}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {alert.service ?? "—"}
                  </td>
                  <td className="max-w-xs px-4 py-3 text-muted-foreground">
                    <span className="line-clamp-2">{alert.summary ?? "—"}</span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {alert.status}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatTraceTimestamp(alert.starts_at)}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    {alert.instance ?? alert.job ?? "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
