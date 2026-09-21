import { describe, expect, it } from "vitest";

import type { TraceSpan } from "@/lib/api/types";
import { buildSpanTree, calculateTraceDurationMs } from "@/lib/trace-tree";

const spans: TraceSpan[] = [
  {
    span_id: "root",
    parent_span_id: null,
    name: "GET /health",
    kind: "SERVER",
    start_time: "2026-09-17T15:29:00.000Z",
    end_time: "2026-09-17T15:29:00.010Z",
    duration_ms: 10,
    status: "OK",
    attributes: {},
  },
  {
    span_id: "child-1",
    parent_span_id: "root",
    name: "GET /health http send",
    kind: "CLIENT",
    start_time: "2026-09-17T15:29:00.002Z",
    end_time: "2026-09-17T15:29:00.008Z",
    duration_ms: 6,
    status: "OK",
    attributes: { "http.method": "GET" },
  },
  {
    span_id: "child-2",
    parent_span_id: "root",
    name: "GET /health http send",
    kind: "CLIENT",
    start_time: "2026-09-17T15:29:00.003Z",
    end_time: "2026-09-17T15:29:00.009Z",
    duration_ms: 6,
    status: "OK",
    attributes: {},
  },
];

describe("trace tree helpers", () => {
  it("builds parent-child span hierarchy", () => {
    const tree = buildSpanTree(spans);

    expect(tree).toHaveLength(1);
    expect(tree[0].span.span_id).toBe("root");
    expect(tree[0].children).toHaveLength(2);
    expect(tree[0].children[0].span.span_id).toBe("child-1");
    expect(tree[0].children[1].span.span_id).toBe("child-2");
  });

  it("calculates total trace duration from span timestamps", () => {
    expect(calculateTraceDurationMs(spans)).toBe(10);
  });
});
