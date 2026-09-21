import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { MAIN_SCROLL_CONTAINER_ID } from "@/components/reliability/back-to-top-button";
import { ApiError } from "@/lib/api/client";
import * as observabilityApi from "@/lib/api/observability";
import { MetricsPage } from "@/pages/metrics";

vi.mock("@/lib/api/observability", () => ({
  getObservabilityHealth: vi.fn(),
  getServiceHealth: vi.fn(),
  getRequestMetrics: vi.fn(),
  getPostgresMetrics: vi.fn(),
  getSloMetrics: vi.fn(),
}));

const observabilityHealth = {
  status: "healthy" as const,
  checked_at: "2026-09-17T15:30:00.000Z",
  components: [
    { name: "bff" as const, status: "up" as const },
    { name: "prometheus" as const, status: "up" as const, latency_ms: 12 },
    { name: "loki" as const, status: "up" as const, latency_ms: 10 },
    { name: "tempo" as const, status: "up" as const, latency_ms: 11 },
    { name: "alertmanager" as const, status: "up" as const, latency_ms: 9 },
  ],
};

const serviceHealth = {
  checked_at: "2026-09-17T15:30:00.000Z",
  services: [
    {
      service: "user-service",
      job: "user-service",
      instance: "user-service:8001",
      up: true,
    },
    {
      service: "order-service",
      job: "order-service",
      instance: "order-service:8002",
      up: true,
    },
    {
      service: "payment-service",
      job: "payment-service",
      instance: "payment-service:8003",
      up: false,
    },
  ],
};

const requestMetrics = {
  checked_at: "2026-09-17T15:30:00.000Z",
  window: {
    start: "2026-09-17T15:00:00.000Z",
    end: "2026-09-17T15:30:00.000Z",
    step_seconds: 60,
  },
  series: {
    request_rate: [
      {
        labels: { service: "order-service" },
        points: [{ timestamp: "2026-09-17T15:29:00.000Z", value: 1.24 }],
      },
    ],
    error_rate_5xx: [
      {
        labels: { service: "order-service" },
        points: [{ timestamp: "2026-09-17T15:29:00.000Z", value: 0.0042 }],
      },
    ],
    latency_p95_seconds: [
      {
        labels: { service: "order-service" },
        points: [{ timestamp: "2026-09-17T15:29:00.000Z", value: 0.124 }],
      },
    ],
  },
};

const sloMetrics = {
  checked_at: "2026-09-17T15:30:00.000Z",
  service: "order-service",
  availability: {
    sli: 0.995,
    target: 0.99,
    compliant: true,
    error_budget_remaining: 0.82,
    error_budget_consumed: 0.18,
  },
  latency: {
    p95_seconds: 0.124,
    target_seconds: 0.5,
    compliant: true,
  },
  diagnostics: {
    error_rate_5xx_ratio: 0.0042,
    request_rate_5m: 0.3,
  },
};

const postgresMetrics = {
  checked_at: "2026-09-17T15:30:00.000Z",
  postgres: { up: true, datname: "k8s_reliability" },
  exporter: { up: true, instance: "postgres-exporter:9187" },
  connections: 5,
  database_size_bytes: 12345678,
};

function renderMetricsPage(initialEntry = "/observability/metrics") {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/observability/metrics" element={<MetricsPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

function mockSuccessfulMetrics() {
  vi.mocked(observabilityApi.getObservabilityHealth).mockResolvedValue(observabilityHealth);
  vi.mocked(observabilityApi.getServiceHealth).mockResolvedValue(serviceHealth);
  vi.mocked(observabilityApi.getRequestMetrics).mockResolvedValue(requestMetrics);
  vi.mocked(observabilityApi.getPostgresMetrics).mockResolvedValue(postgresMetrics);
  vi.mocked(observabilityApi.getSloMetrics).mockResolvedValue(sloMetrics);
}

describe("MetricsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, "scrollY", {
      value: 0,
      writable: true,
      configurable: true,
    });
    vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("shows a loading state on first load", () => {
    mockSuccessfulMetrics();
    vi.mocked(observabilityApi.getServiceHealth).mockImplementation(
      () => new Promise(() => undefined),
    );

    renderMetricsPage();

    expect(screen.getAllByText("Loading metrics…").length).toBeGreaterThan(0);
  });

  it("renders service health from the BFF", async () => {
    mockSuccessfulMetrics();
    renderMetricsPage();

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "user-service" })).toBeInTheDocument();
    });

    expect(screen.getByRole("heading", { name: "order-service" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "payment-service" })).toBeInTheDocument();
    expect(screen.getAllByText("UP").length).toBeGreaterThan(0);
    expect(screen.getByText("DOWN")).toBeInTheDocument();
  });

  it("renders live request metrics values", async () => {
    mockSuccessfulMetrics();
    renderMetricsPage();

    await waitFor(() => {
      expect(screen.getAllByText("1.24 req/s").length).toBeGreaterThan(0);
    });

    expect(screen.getAllByText("0.42%").length).toBeGreaterThan(0);
    expect(screen.getAllByText("124 ms").length).toBeGreaterThan(0);
  });

  it("renders postgres metrics", async () => {
    mockSuccessfulMetrics();
    renderMetricsPage();

    await waitFor(() => {
      expect(screen.getAllByText("postgres-exporter:9187").length).toBeGreaterThan(0);
    });

    expect(screen.getAllByText("11.8 MB").length).toBeGreaterThan(0);
  });

  it("renders slo metrics when a service is selected", async () => {
    mockSuccessfulMetrics();
    renderMetricsPage("/observability/metrics?service=order-service");

    await waitFor(() => {
      expect(screen.getByText("99.5%")).toBeInTheDocument();
    });

    expect(screen.getByText("82%")).toBeInTheDocument();
    expect(screen.getAllByText("Compliant").length).toBeGreaterThan(0);
  });

  it("updates the URL when the service filter changes", async () => {
    mockSuccessfulMetrics();
    const user = userEvent.setup();
    renderMetricsPage();

    await waitFor(() => {
      expect(screen.getByLabelText("Service filter")).toBeInTheDocument();
    });

    await user.selectOptions(screen.getByLabelText("Service filter"), "order-service");

    await waitFor(() => {
      expect(observabilityApi.getRequestMetrics).toHaveBeenCalledWith({
        service: "order-service",
      });
    });
    expect(observabilityApi.getSloMetrics).toHaveBeenCalledWith("order-service");
  });

  it("shows correlation links for the selected service", async () => {
    mockSuccessfulMetrics();
    renderMetricsPage("/observability/metrics?service=order-service");

    await waitFor(() => {
      expect(
        screen.getAllByRole("link", { name: /Logs/i })[0],
      ).toHaveAttribute("href", "/observability/logs?service=order-service");
    });

    expect(screen.getAllByRole("link", { name: /Traces/i })[0]).toHaveAttribute(
      "href",
      "/observability/traces?service=order-service",
    );
  });

  it("shows an error state when service health fails", async () => {
    mockSuccessfulMetrics();
    vi.mocked(observabilityApi.getServiceHealth).mockRejectedValue(
      new ApiError("Prometheus unavailable", 502, "UPSTREAM_UNAVAILABLE"),
    );

    renderMetricsPage();

    await waitFor(() => {
      expect(screen.getByText("Prometheus unavailable")).toBeInTheDocument();
    });
  });

  it("shows no-data state for empty time series", async () => {
    mockSuccessfulMetrics();
    vi.mocked(observabilityApi.getRequestMetrics).mockResolvedValue({
      ...requestMetrics,
      series: {
        request_rate: [],
        error_rate_5xx: [],
        latency_p95_seconds: [],
      },
    });

    renderMetricsPage();

    await waitFor(() => {
      expect(screen.getAllByText("No data in selected window").length).toBeGreaterThan(0);
    });
  });

  it("shows null points as no current data", async () => {
    mockSuccessfulMetrics();
    vi.mocked(observabilityApi.getRequestMetrics).mockResolvedValue({
      ...requestMetrics,
      series: {
        request_rate: [
          {
            labels: { service: "order-service" },
            points: [{ timestamp: "2026-09-17T15:29:00.000Z", value: null }],
          },
        ],
        error_rate_5xx: [],
        latency_p95_seconds: [],
      },
    });

    renderMetricsPage();

    await waitFor(() => {
      expect(screen.getByText("No current data")).toBeInTheDocument();
    });
  });

  it("shows actual zero values as zero", async () => {
    mockSuccessfulMetrics();
    vi.mocked(observabilityApi.getRequestMetrics).mockResolvedValue({
      ...requestMetrics,
      series: {
        request_rate: [
          {
            labels: { service: "order-service" },
            points: [{ timestamp: "2026-09-17T15:29:00.000Z", value: 0 }],
          },
        ],
        error_rate_5xx: [],
        latency_p95_seconds: [],
      },
    });

    renderMetricsPage();

    await waitFor(() => {
      expect(screen.getByText("0.00 req/s")).toBeInTheDocument();
    });
  });

  it("includes Grafana links", async () => {
    mockSuccessfulMetrics();
    renderMetricsPage();

    await waitFor(() => {
      expect(
        screen.getAllByRole("link", { name: /Open in Grafana/i })[0],
      ).toHaveAttribute("href", "http://localhost:3000/d/krp-services/krp-services");
    });
  });

  it("shows LIVE when request metrics polling succeeds", async () => {
    mockSuccessfulMetrics();
    renderMetricsPage();

    await waitFor(() => {
      expect(screen.getByRole("status", { name: "Live" })).toBeInTheDocument();
    });
  });

  it("shows DISCONNECTED when request metrics polling fails", async () => {
    mockSuccessfulMetrics();
    vi.mocked(observabilityApi.getRequestMetrics).mockRejectedValue(
      new ApiError("Prometheus unavailable", 502, "UPSTREAM_UNAVAILABLE"),
    );

    renderMetricsPage();

    await waitFor(() => {
      expect(screen.getByRole("status", { name: "Disconnected" })).toBeInTheDocument();
    });

    expect(screen.queryByRole("status", { name: "Live" })).not.toBeInTheDocument();
  });

  it("shows Back to top after meaningful scroll and scrolls to the top when clicked", async () => {
    const user = userEvent.setup();
    mockSuccessfulMetrics();

    const scrollContainer = document.createElement("main");
    scrollContainer.id = MAIN_SCROLL_CONTAINER_ID;
    const scrollTo = vi.fn();
    scrollContainer.scrollTo = scrollTo;
    document.body.appendChild(scrollContainer);

    renderMetricsPage();

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Metrics" })).toBeInTheDocument();
    });

    expect(screen.queryByRole("button", { name: "Back to top" })).not.toBeInTheDocument();

    Object.defineProperty(scrollContainer, "scrollTop", {
      value: 400,
      writable: true,
      configurable: true,
    });
    fireEvent.scroll(scrollContainer);

    const backToTopButton = await waitFor(() =>
      screen.getByRole("button", { name: "Back to top" }),
    );
    expect(backToTopButton).toBeVisible();

    await user.click(backToTopButton);
    expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "smooth" });
    scrollContainer.remove();
  });
});
