import type { Alert } from "@/lib/api/types";

const SEVERITY_ORDER: Record<string, number> = {
  critical: 0,
  warning: 1,
};

export function severityBadgeVariant(
  severity: string | null,
): "destructive" | "warning" | "muted" {
  if (severity === "critical") {
    return "destructive";
  }
  if (severity === "warning") {
    return "warning";
  }
  return "muted";
}

export function formatSeverityLabel(severity: string | null): string {
  if (!severity) {
    return "Unknown";
  }
  return severity.charAt(0).toUpperCase() + severity.slice(1);
}

export function compareAlerts(left: Alert, right: Alert): number {
  const leftSeverity = SEVERITY_ORDER[left.severity ?? ""] ?? 2;
  const rightSeverity = SEVERITY_ORDER[right.severity ?? ""] ?? 2;
  if (leftSeverity !== rightSeverity) {
    return leftSeverity - rightSeverity;
  }

  const leftStartsAt = left.starts_at ?? "";
  const rightStartsAt = right.starts_at ?? "";
  return rightStartsAt.localeCompare(leftStartsAt);
}

export function sortAlerts(alerts: Alert[]): Alert[] {
  return [...alerts].sort(compareAlerts);
}

export function countAlertsBySeverity(
  alerts: Alert[],
  severity: "critical" | "warning",
): number {
  return alerts.filter((alert) => alert.severity === severity).length;
}
