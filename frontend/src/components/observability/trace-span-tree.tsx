import { Badge } from "@/components/ui/badge";
import type { TraceSpan } from "@/lib/api/types";
import { formatDurationMs, formatTraceTimestamp } from "@/lib/metrics-format";
import type { SpanTreeNode } from "@/lib/trace-tree";
import { cn } from "@/lib/utils";

const HTTP_ATTRIBUTE_KEYS = [
  "http.method",
  "http.route",
  "http.target",
  "http.status_code",
] as const;

function statusBadgeVariant(
  status: string | null,
): "success" | "destructive" | "muted" {
  const normalized = status?.toUpperCase() ?? "";
  if (normalized === "OK") {
    return "success";
  }
  if (normalized === "ERROR") {
    return "destructive";
  }
  return "muted";
}

function formatHttpSummary(attributes: TraceSpan["attributes"]): string | null {
  const method = attributes["http.method"];
  const route =
    attributes["http.route"] ?? attributes["http.target"] ?? null;
  const statusCode = attributes["http.status_code"];

  const parts: string[] = [];
  if (method) {
    parts.push(String(method));
  }
  if (route) {
    parts.push(String(route));
  }
  if (statusCode !== null && statusCode !== undefined) {
    parts.push(String(statusCode));
  }

  return parts.length > 0 ? parts.join(" ") : null;
}

function otherAttributes(attributes: TraceSpan["attributes"]): Array<[string, string]> {
  return Object.entries(attributes)
    .filter(
      ([key, value]) =>
        !HTTP_ATTRIBUTE_KEYS.includes(key as (typeof HTTP_ATTRIBUTE_KEYS)[number]) &&
        value !== null &&
        value !== undefined,
    )
    .map(([key, value]) => [key, String(value)]);
}

interface TraceSpanTreeProps {
  nodes: SpanTreeNode[];
  depth?: number;
}

function TraceSpanNode({ node, depth }: { node: SpanTreeNode; depth: number }) {
  const httpSummary = formatHttpSummary(node.span.attributes);
  const extras = otherAttributes(node.span.attributes);

  return (
    <li className="space-y-2">
      <div
        className={cn(
          "rounded-md border border-border bg-card/50 px-3 py-2",
          depth > 0 && "ml-4 border-l-2 border-l-border/80",
        )}
        style={{ marginLeft: depth > 0 ? depth * 1.25 + "rem" : undefined }}
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-1">
            <p className="break-words text-sm font-medium text-foreground">
              {node.span.name ?? "Unnamed span"}
            </p>
            {httpSummary ? (
              <p className="font-mono text-xs text-muted-foreground">{httpSummary}</p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {node.span.kind ? <Badge variant="muted">{node.span.kind}</Badge> : null}
            {node.span.status ? (
              <Badge variant={statusBadgeVariant(node.span.status)}>
                {node.span.status}
              </Badge>
            ) : null}
            <span>{formatDurationMs(node.span.duration_ms)}</span>
            <span>{formatTraceTimestamp(node.span.start_time)}</span>
          </div>
        </div>

        {extras.length > 0 ? (
          <details className="mt-2 text-xs text-muted-foreground">
            <summary className="cursor-pointer select-none text-foreground/80">
              Additional attributes
            </summary>
            <ul className="mt-2 space-y-1 font-mono">
              {extras.map(([key, value]) => (
                <li key={key} className="break-all">
                  <span className="text-foreground/70">{key}</span>: {value}
                </li>
              ))}
            </ul>
          </details>
        ) : null}
      </div>

      {node.children.length > 0 ? (
        <ul className="space-y-2 border-l border-dashed border-border/70 pl-3">
          {node.children.map((child) => (
            <TraceSpanNode key={child.span.span_id} node={child} depth={depth + 1} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

export function TraceSpanTree({ nodes, depth = 0 }: TraceSpanTreeProps) {
  return (
    <ul className="space-y-3" role="tree">
      {nodes.map((node) => (
        <TraceSpanNode key={node.span.span_id} node={node} depth={depth} />
      ))}
    </ul>
  );
}
