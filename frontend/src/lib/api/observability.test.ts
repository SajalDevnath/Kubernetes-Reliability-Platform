import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api/client";
import {
  getAlerts,
  getLogs,
  getObservabilityHealth,
  getPostgresMetrics,
  getRequestMetrics,
  getServiceHealth,
  getSloMetrics,
  getTrace,
  getTraces,
} from "@/lib/api/observability";

describe("observability api client", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("requests observability health", async () => {
    const payload = {
      status: "healthy",
      components: [],
      checked_at: "2026-09-17T15:30:00.000Z",
    };
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(payload), { status: 200 }),
    );

    await expect(getObservabilityHealth()).resolves.toEqual(payload);
    expect(fetch).toHaveBeenCalledWith("/api/observability/health", {
      headers: expect.any(Headers),
    });
  });

  it("requests service health", async () => {
    const payload = { checked_at: "2026-09-17T15:30:00.000Z", services: [] };
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(payload), { status: 200 }),
    );

    await expect(getServiceHealth()).resolves.toEqual(payload);
    expect(fetch).toHaveBeenCalledWith("/api/observability/metrics/services", {
      headers: expect.any(Headers),
    });
  });

  it("requests request metrics with optional params", async () => {
    const payload = {
      checked_at: "2026-09-17T15:30:00.000Z",
      window: {
        start: "2026-09-17T15:00:00.000Z",
        end: "2026-09-17T15:30:00.000Z",
        step_seconds: 60,
      },
      series: {
        request_rate: [],
        error_rate_5xx: [],
        latency_p95_seconds: [],
      },
    };
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(payload), { status: 200 }),
    );

    await expect(
      getRequestMetrics({ service: "order-service", minutes: 30 }),
    ).resolves.toEqual(payload);
    expect(fetch).toHaveBeenCalledWith(
      "/api/observability/metrics/requests?service=order-service&minutes=30",
      { headers: expect.any(Headers) },
    );
  });

  it("requests slo metrics for a service", async () => {
    const payload = {
      checked_at: "2026-09-17T15:30:00.000Z",
      service: "order-service",
      availability: {
        sli: 0.995,
        target: 0.99,
        compliant: true,
        error_budget_remaining: 0.5,
        error_budget_consumed: 0.5,
      },
      latency: {
        p95_seconds: 0.12,
        target_seconds: 0.5,
        compliant: true,
      },
      diagnostics: {
        error_rate_5xx_ratio: 0.01,
        request_rate_5m: 0.3,
      },
    };
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(payload), { status: 200 }),
    );

    await expect(getSloMetrics("order-service")).resolves.toEqual(payload);
    expect(fetch).toHaveBeenCalledWith(
      "/api/observability/metrics/slo?service=order-service",
      { headers: expect.any(Headers) },
    );
  });

  it("requests logs for a service", async () => {
    const payload = {
      checked_at: "2026-09-17T15:30:00.000Z",
      service: "user-service",
      limit: 50,
      logs: [],
    };
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(payload), { status: 200 }),
    );

    await expect(getLogs("user-service")).resolves.toEqual(payload);
    expect(fetch).toHaveBeenCalledWith(
      "/api/observability/logs?service=user-service&limit=50",
      { headers: expect.any(Headers) },
    );
  });

  it("requests logs with a custom limit", async () => {
    const payload = {
      checked_at: "2026-09-17T15:30:00.000Z",
      service: "order-service",
      limit: 25,
      logs: [],
    };
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(payload), { status: 200 }),
    );

    await expect(getLogs("order-service", 25)).resolves.toEqual(payload);
    expect(fetch).toHaveBeenCalledWith(
      "/api/observability/logs?service=order-service&limit=25",
      { headers: expect.any(Headers) },
    );
  });

  it("requests traces with optional service filter", async () => {
    const payload = {
      checked_at: "2026-09-17T15:30:00.000Z",
      service: "user-service",
      limit: 20,
      traces: [],
    };
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(payload), { status: 200 }),
    );

    await expect(getTraces("user-service")).resolves.toEqual(payload);
    expect(fetch).toHaveBeenCalledWith(
      "/api/observability/traces?limit=20&service=user-service",
      { headers: expect.any(Headers) },
    );
  });

  it("requests traces without a service filter", async () => {
    const payload = {
      checked_at: "2026-09-17T15:30:00.000Z",
      service: null,
      limit: 20,
      traces: [],
    };
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(payload), { status: 200 }),
    );

    await expect(getTraces()).resolves.toEqual(payload);
    expect(fetch).toHaveBeenCalledWith("/api/observability/traces?limit=20", {
      headers: expect.any(Headers),
    });
  });

  it("requests trace detail by id", async () => {
    const payload = {
      checked_at: "2026-09-17T15:30:00.000Z",
      trace_id: "70da75c121a8e55fb8dc385971bbde24",
      service: "user-service",
      spans: [],
    };
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(payload), { status: 200 }),
    );

    await expect(getTrace("70da75c121a8e55fb8dc385971bbde24")).resolves.toEqual(payload);
    expect(fetch).toHaveBeenCalledWith(
      "/api/observability/traces/70da75c121a8e55fb8dc385971bbde24",
      { headers: expect.any(Headers) },
    );
  });

  it("requests active alerts", async () => {
    const payload = {
      checked_at: "2026-09-17T15:30:00.000Z",
      alerts: [],
    };
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(payload), { status: 200 }),
    );

    await expect(getAlerts()).resolves.toEqual(payload);
    expect(fetch).toHaveBeenCalledWith("/api/observability/alerts", {
      headers: expect.any(Headers),
    });
  });

  it("requests postgres metrics", async () => {
    const payload = {
      checked_at: "2026-09-17T15:30:00.000Z",
      postgres: { up: true, datname: "k8s_reliability" },
      exporter: { up: true, instance: "postgres-exporter:9187" },
      connections: 5,
      database_size_bytes: 12345678,
    };
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(payload), { status: 200 }),
    );

    await expect(getPostgresMetrics()).resolves.toEqual(payload);
    expect(fetch).toHaveBeenCalledWith("/api/observability/metrics/postgres", {
      headers: expect.any(Headers),
    });
  });

  it("parses BFF error envelopes", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          error: {
            code: "INVALID_REQUEST",
            message: "Unknown service",
            upstream: null,
            request_id: null,
          },
        }),
        { status: 400 },
      ),
    );

    await expect(getSloMetrics("order-service")).rejects.toEqual(
      new ApiError("Unknown service", 400, "INVALID_REQUEST"),
    );
  });
});
