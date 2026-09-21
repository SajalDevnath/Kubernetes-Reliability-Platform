import { FactTile } from "@/components/layout/fact-tile";
import type { TimeSeries } from "@/lib/api/types";
import {
  getLatestNumericValue,
  getRecentPoints,
  hasTimeSeriesData,
} from "@/lib/metrics-format";

interface TimeSeriesMetricCardProps {
  label: string;
  detail: string;
  formattedValue: string;
  series: TimeSeries[];
  warningValue?: boolean;
}

export function TimeSeriesMetricCard({
  label,
  detail,
  formattedValue,
  series,
  warningValue = false,
}: TimeSeriesMetricCardProps) {
  const recentPoints = getRecentPoints(series, 8);
  const latestValue = getLatestNumericValue(series);
  const hasData = hasTimeSeriesData(series);

  if (!hasData) {
    return (
      <div className="rounded-lg border border-border bg-card/60 px-4 py-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">No data in selected window</p>
      </div>
    );
  }

  if (latestValue === null) {
    return (
      <div className="rounded-lg border border-border bg-card/60 px-4 py-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">No current data</p>
      </div>
    );
  }

  const maxValue = Math.max(...recentPoints.map((point) => point.value), 0.0001);

  return (
    <div className="space-y-3 rounded-lg border border-border bg-card/60 px-4 py-3">
      <FactTile
        label={label}
        value={formattedValue}
        detail={detail}
        className={warningValue ? "border-warning/30 bg-warning/5" : "border-0 bg-transparent p-0"}
      />
      {recentPoints.length > 0 ? (
        <div>
          <p className="mb-2 text-[11px] uppercase tracking-wide text-muted-foreground">
            Recent history
          </p>
          <div className="flex h-10 items-end gap-1" aria-hidden="true">
            {recentPoints.map((point) => (
              <div
                key={point.timestamp}
                className="w-2 rounded-sm bg-primary/70 transition-all"
                style={{ height: `${Math.max((point.value / maxValue) * 100, 6)}%` }}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
