import { AlertCircle, Loader2, RefreshCw } from "lucide-react";

import { TraceSpanTree } from "@/components/observability/trace-span-tree";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TraceDetailResponse } from "@/lib/api/types";
import { formatDurationMs } from "@/lib/metrics-format";
import { buildSpanTree, calculateTraceDurationMs } from "@/lib/trace-tree";

interface TraceDetailPanelProps {
  status: "idle" | "loading" | "success" | "error";
  data: TraceDetailResponse | null;
  error: string | null;
  onRetry?: () => void;
}

export function TraceDetailPanel({
  status,
  data,
  error,
  onRetry,
}: TraceDetailPanelProps) {
  if (status === "idle") {
    return (
      <div className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
        Select a trace to inspect its spans.
      </div>
    );
  }

  if (status === "loading") {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-border bg-card/40 px-4 py-8 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        Loading trace detail…
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex flex-col gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-2 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{error ?? "Trace detail unavailable"}</span>
        </div>
        {onRetry ? (
          <Button variant="outline" size="sm" onClick={() => void onRetry()}>
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            Retry
          </Button>
        ) : null}
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const spanTree = buildSpanTree(data.spans);
  const totalDuration = calculateTraceDurationMs(data.spans);

  return (
    <Card className="bg-card/60">
      <CardHeader className="space-y-3 pb-3">
        <CardTitle className="text-base">Trace detail</CardTitle>
        <div className="grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Trace ID</p>
            <p className="break-all font-mono text-foreground">{data.trace_id}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Service</p>
            <p className="text-foreground">{data.service ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Total duration
            </p>
            <p className="text-foreground">{formatDurationMs(totalDuration)}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Spans</p>
            <p className="text-foreground">{data.spans.length}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <TraceSpanTree nodes={spanTree} />
      </CardContent>
    </Card>
  );
}
