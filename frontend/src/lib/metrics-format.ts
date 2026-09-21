import type { TimeSeries } from "@/lib/api/types";

const NO_DATA = "No data";

export function formatRequestRate(value: number | null): string {
  if (value === null) {
    return NO_DATA;
  }
  return `${value.toFixed(2)} req/s`;
}

export function formatErrorRateRatio(value: number | null): string {
  if (value === null) {
    return NO_DATA;
  }
  return `${(value * 100).toFixed(2)}%`;
}

export function formatLatencySeconds(value: number | null): string {
  if (value === null) {
    return NO_DATA;
  }
  return `${Math.round(value * 1000)} ms`;
}

export function formatAvailabilityRatio(value: number | null): string {
  if (value === null) {
    return NO_DATA;
  }
  return `${(value * 100).toFixed(1)}%`;
}

export function formatErrorBudgetRatio(value: number | null): string {
  if (value === null) {
    return NO_DATA;
  }
  return `${(value * 100).toFixed(0)}%`;
}

export function formatBytes(value: number | null): string {
  if (value === null) {
    return NO_DATA;
  }
  if (value < 1024) {
    return `${value} B`;
  }
  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }
  if (value < 1024 * 1024 * 1024) {
    return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${(value / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function formatCheckedAt(iso: string | undefined): string {
  if (!iso) {
    return "—";
  }
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(iso));
}

export function formatDurationMs(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return NO_DATA;
  }
  if (value < 1000) {
    return `${value} ms`;
  }
  return `${(value / 1000).toFixed(2)} s`;
}

export function formatTraceTimestamp(iso: string | null | undefined): string {
  if (!iso) {
    return NO_DATA;
  }
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(iso));
}

export function formatRelativeCheckedAt(iso: string | undefined): string {
  if (!iso) {
    return "—";
  }
  const seconds = Math.max(
    0,
    Math.round((Date.now() - new Date(iso).getTime()) / 1000),
  );
  if (seconds < 60) {
    return `${seconds}s ago`;
  }
  const minutes = Math.round(seconds / 60);
  return `${minutes}m ago`;
}

export function getLatestNumericValue(seriesList: TimeSeries[]): number | null {
  let latestTimestamp = "";
  let latestValue: number | null = null;

  for (const series of seriesList) {
    for (const point of series.points) {
      if (point.value === null) {
        continue;
      }
      if (!latestTimestamp || point.timestamp > latestTimestamp) {
        latestTimestamp = point.timestamp;
        latestValue = point.value;
      }
    }
  }

  return latestValue;
}

export function getRecentPoints(
  seriesList: TimeSeries[],
  limit = 8,
): Array<{ timestamp: string; value: number }> {
  const points = seriesList
    .flatMap((series) =>
      series.points
        .filter((point) => point.value !== null)
        .map((point) => ({
          timestamp: point.timestamp,
          value: point.value as number,
        })),
    )
    .sort((left, right) => left.timestamp.localeCompare(right.timestamp));

  return points.slice(-limit);
}

export function hasTimeSeriesData(seriesList: TimeSeries[]): boolean {
  return seriesList.some((series) => series.points.length > 0);
}
