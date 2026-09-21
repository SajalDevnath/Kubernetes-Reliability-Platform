import type { TraceSpan } from "@/lib/api/types";

export interface SpanTreeNode {
  span: TraceSpan;
  children: SpanTreeNode[];
}

function compareStartTime(left: TraceSpan, right: TraceSpan): number {
  const leftTime = left.start_time ?? "";
  const rightTime = right.start_time ?? "";
  return leftTime.localeCompare(rightTime);
}

function sortTreeNodes(nodes: SpanTreeNode[]): void {
  nodes.sort((left, right) => compareStartTime(left.span, right.span));
  for (const node of nodes) {
    sortTreeNodes(node.children);
  }
}

export function buildSpanTree(spans: TraceSpan[]): SpanTreeNode[] {
  const nodes = new Map<string, SpanTreeNode>();
  for (const span of spans) {
    nodes.set(span.span_id, { span, children: [] });
  }

  const roots: SpanTreeNode[] = [];
  for (const span of spans) {
    const node = nodes.get(span.span_id);
    if (!node) {
      continue;
    }
    if (span.parent_span_id && nodes.has(span.parent_span_id)) {
      nodes.get(span.parent_span_id)?.children.push(node);
    } else {
      roots.push(node);
    }
  }

  sortTreeNodes(roots);
  return roots;
}

export function calculateTraceDurationMs(spans: TraceSpan[]): number | null {
  const starts = spans
    .map((span) => span.start_time)
    .filter((value): value is string => Boolean(value));
  const ends = spans
    .map((span) => span.end_time)
    .filter((value): value is string => Boolean(value));

  if (starts.length === 0 || ends.length === 0) {
    const durations = spans
      .map((span) => span.duration_ms)
      .filter((value): value is number => value !== null);
    if (durations.length === 0) {
      return null;
    }
    return durations.reduce((max, value) => Math.max(max, value), 0);
  }

  const earliest = starts.sort()[0];
  const latest = ends.sort().at(-1);
  if (!earliest || !latest) {
    return null;
  }

  const duration = new Date(latest).getTime() - new Date(earliest).getTime();
  return duration >= 0 ? duration : null;
}
