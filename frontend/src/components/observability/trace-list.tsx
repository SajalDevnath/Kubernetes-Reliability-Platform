import type { TraceSummary } from "@/lib/api/types";
import { formatDurationMs, formatTraceTimestamp } from "@/lib/metrics-format";
import { cn } from "@/lib/utils";

interface TraceListProps {
  traces: TraceSummary[];
  selectedTraceId: string | null;
  onSelect: (traceId: string) => void;
}

export function TraceList({ traces, selectedTraceId, onSelect }: TraceListProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-border bg-muted/30 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Trace ID</th>
              <th className="px-4 py-3 font-medium">Service</th>
              <th className="px-4 py-3 font-medium">Root operation</th>
              <th className="px-4 py-3 font-medium">Duration</th>
              <th className="px-4 py-3 font-medium">Start time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {traces.map((trace) => {
              const isSelected = trace.trace_id === selectedTraceId;
              return (
                <tr
                  key={trace.trace_id}
                  className={cn(
                    "cursor-pointer transition-colors hover:bg-card/70",
                    isSelected && "bg-primary/10",
                  )}
                  onClick={() => onSelect(trace.trace_id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onSelect(trace.trace_id);
                    }
                  }}
                  tabIndex={0}
                  aria-selected={isSelected}
                >
                  <td className="px-4 py-3 font-mono text-xs break-all text-foreground">
                    {trace.trace_id}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {trace.service ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-foreground">
                    {trace.root_operation ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatDurationMs(trace.duration_ms)}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatTraceTimestamp(trace.start_time)}
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
