import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api/client";
import * as observabilityApi from "@/lib/api/observability";
import { AlertsPage } from "@/pages/alerts";
import { router } from "@/routes/router";

vi.mock("@/lib/api/observability", () => ({
  getAlerts: vi.fn(),
}));

const criticalAlert = {
  fingerprint: "critical-alert-1",
  alert_name: "KRPServiceTargetDown",
  status: "active",
  severity: "critical",
  service: "payment-service",
  job: "payment-service",
  instance: "payment-service:8003",
  summary: "Payment service target is down",
  description: "Prometheus cannot scrape payment-service.",
  starts_at: "2026-09-17T15:29:00.000Z",
  ends_at: null,
  generator_url: "http://prometheus/graph?g0.expr=up",
  labels: {
    alertname: "KRPServiceTargetDown",
    severity: "critical",
    service: "payment-service",
    job: "payment-service",
    instance: "payment-service:8003",
  },
  annotations: {
    summary: "Payment service target is down",
    description: "Prometheus cannot scrape payment-service.",
  },
};

const warningAlert = {
  fingerprint: "warning-alert-1",
  alert_name: "KRPHigh5xxErrorRate",
  status: "active",
  severity: "warning",
  service: "order-service",
  job: "order-service",
  instance: "order-service:8002",
  summary: "High 5xx error rate on order-service",
  description: "5xx ratio exceeded the configured threshold.",
  starts_at: "2026-09-17T15:30:00.000Z",
  ends_at: null,
  generator_url: "http://prometheus/graph?g0.expr=errors",
  labels: {
    alertname: "KRPHigh5xxErrorRate",
    severity: "warning",
    service: "order-service",
    job: "order-service",
    instance: "order-service:8002",
  },
  annotations: {
    summary: "High 5xx error rate on order-service",
    description: "5xx ratio exceeded the configured threshold.",
  },
};

const alertsResponse = {
  checked_at: "2026-09-17T15:30:00.000Z",
  alerts: [warningAlert, criticalAlert],
};

const emptyAlertsResponse = {
  checked_at: "2026-09-17T15:30:00.000Z",
  alerts: [],
};

function renderAlertsPage(initialEntry = "/observability/alerts") {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/observability/alerts" element={<AlertsPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

function mockSuccessfulAlerts() {
  vi.mocked(observabilityApi.getAlerts).mockResolvedValue(alertsResponse);
}

describe("AlertsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("shows a loading state on first load", () => {
    mockSuccessfulAlerts();
    vi.mocked(observabilityApi.getAlerts).mockImplementation(
      () => new Promise(() => undefined),
    );

    renderAlertsPage();

    expect(screen.getByText("Loading alerts…")).toBeInTheDocument();
  });

  it("renders populated alerts from the BFF", async () => {
    mockSuccessfulAlerts();
    renderAlertsPage();

    await waitFor(() => {
      expect(screen.getByText("KRPServiceTargetDown")).toBeInTheDocument();
    });

    expect(screen.getByText("KRPHigh5xxErrorRate")).toBeInTheDocument();
    expect(observabilityApi.getAlerts).toHaveBeenCalledTimes(1);
  });

  it("renders critical alerts before warning alerts", async () => {
    mockSuccessfulAlerts();
    renderAlertsPage();

    await waitFor(() => {
      expect(screen.getByText("KRPServiceTargetDown")).toBeInTheDocument();
    });

    const alertNames = screen
      .getAllByRole("row")
      .slice(1)
      .map((row) => row.textContent ?? "");

    expect(alertNames[0]).toContain("KRPServiceTargetDown");
    expect(alertNames[1]).toContain("KRPHigh5xxErrorRate");
  });

  it("shows summary counts for active, critical, and warning alerts", async () => {
    mockSuccessfulAlerts();
    renderAlertsPage();

    await waitFor(() => {
      expect(
        screen.getByText("Currently firing alerts reported by Alertmanager."),
      ).toBeInTheDocument();
    });

    expect(
      screen.getByText("Alerts routed to the critical receiver."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Alerts routed to the warning receiver."),
    ).toBeInTheDocument();
  });

  it("filters alerts locally by severity", async () => {
    mockSuccessfulAlerts();
    const user = userEvent.setup();
    renderAlertsPage();

    await waitFor(() => {
      expect(screen.getByText("KRPHigh5xxErrorRate")).toBeInTheDocument();
    });

    await user.selectOptions(screen.getByLabelText("Severity"), "critical");

    expect(screen.getByText("KRPServiceTargetDown")).toBeInTheDocument();
    expect(screen.queryByText("KRPHigh5xxErrorRate")).not.toBeInTheDocument();
    expect(observabilityApi.getAlerts).toHaveBeenCalledTimes(1);
  });

  it("filters alerts locally by service", async () => {
    mockSuccessfulAlerts();
    const user = userEvent.setup();
    renderAlertsPage();

    await waitFor(() => {
      expect(screen.getByText("KRPHigh5xxErrorRate")).toBeInTheDocument();
    });

    await user.selectOptions(screen.getByLabelText("Service"), "order-service");

    expect(screen.getByText("KRPHigh5xxErrorRate")).toBeInTheDocument();
    expect(screen.queryByText("KRPServiceTargetDown")).not.toBeInTheDocument();
  });

  it("filters alerts locally by search query", async () => {
    mockSuccessfulAlerts();
    const user = userEvent.setup();
    renderAlertsPage();

    await waitFor(() => {
      expect(screen.getByText("KRPHigh5xxErrorRate")).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText("Search alerts"), "payment");

    expect(screen.getByText("KRPServiceTargetDown")).toBeInTheDocument();
    expect(screen.queryByText("KRPHigh5xxErrorRate")).not.toBeInTheDocument();
  });

  it("shows an empty state when no alerts are returned", async () => {
    vi.mocked(observabilityApi.getAlerts).mockResolvedValue(emptyAlertsResponse);
    renderAlertsPage();

    await waitFor(() => {
      expect(screen.getByText("No active alerts")).toBeInTheDocument();
    });

    expect(
      screen.getByText("Alertmanager reports no currently firing alerts."),
    ).toBeInTheDocument();
  });

  it("shows LIVE when alert polling succeeds", async () => {
    mockSuccessfulAlerts();
    renderAlertsPage();

    await waitFor(() => {
      expect(screen.getByRole("status", { name: "Live" })).toBeInTheDocument();
    });
  });

  it("shows DISCONNECTED when alert polling fails", async () => {
    vi.mocked(observabilityApi.getAlerts).mockRejectedValue(
      new ApiError("Alertmanager unavailable", 502, "UPSTREAM_UNAVAILABLE"),
    );

    renderAlertsPage();

    await waitFor(() => {
      expect(screen.getByRole("status", { name: "Disconnected" })).toBeInTheDocument();
    });

    expect(screen.queryByRole("status", { name: "Live" })).not.toBeInTheDocument();
  });

  it("retains previous data after polling failure", async () => {
    vi.useFakeTimers();
    const mockGetAlerts = vi.mocked(observabilityApi.getAlerts);
    mockGetAlerts.mockResolvedValueOnce(alertsResponse);
    mockGetAlerts.mockRejectedValueOnce(
      new ApiError("Alertmanager unavailable", 502, "UPSTREAM_UNAVAILABLE"),
    );

    renderAlertsPage();

    await act(async () => {
      await vi.runOnlyPendingTimersAsync();
    });

    expect(screen.getByText("KRPServiceTargetDown")).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5_000);
    });

    expect(screen.getByRole("status", { name: "Disconnected" })).toBeInTheDocument();
    expect(screen.getByText("KRPServiceTargetDown")).toBeInTheDocument();
    expect(screen.getByText("KRPHigh5xxErrorRate")).toBeInTheDocument();
  });

  it("expands alert details when an alert is selected", async () => {
    mockSuccessfulAlerts();
    const user = userEvent.setup();
    renderAlertsPage();

    await waitFor(() => {
      expect(screen.getByText("KRPServiceTargetDown")).toBeInTheDocument();
    });

    await user.click(screen.getByText("KRPServiceTargetDown"));

    expect(screen.getByText("Alert details")).toBeInTheDocument();
    expect(screen.getAllByText("Payment service target is down").length).toBeGreaterThan(0);
    expect(
      screen.getAllByText("Prometheus cannot scrape payment-service.").length,
    ).toBeGreaterThan(0);
  });

  it("renders labels and annotations in alert details", async () => {
    mockSuccessfulAlerts();
    const user = userEvent.setup();
    renderAlertsPage();

    await waitFor(() => {
      expect(screen.getByText("KRPServiceTargetDown")).toBeInTheDocument();
    });

    await user.click(screen.getByText("KRPServiceTargetDown"));

    expect(screen.getByText("Labels")).toBeInTheDocument();
    expect(screen.getByText("Annotations")).toBeInTheDocument();
    expect(screen.getAllByText("payment-service:8003").length).toBeGreaterThan(0);
    expect(screen.getByText("alertname")).toBeInTheDocument();
  });

  it("renders generator URL as an external link in alert details", async () => {
    mockSuccessfulAlerts();
    const user = userEvent.setup();
    renderAlertsPage();

    await waitFor(() => {
      expect(screen.getByText("KRPServiceTargetDown")).toBeInTheDocument();
    });

    await user.click(screen.getByText("KRPServiceTargetDown"));

    const link = screen.getByRole("link", { name: /Open in Prometheus/i });
    expect(link).toHaveAttribute("href", "http://prometheus/graph?g0.expr=up");
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("shows alert detail empty state before selection", async () => {
    mockSuccessfulAlerts();
    renderAlertsPage();

    await waitFor(() => {
      expect(screen.getByText("Select an alert to inspect its details.")).toBeInTheDocument();
    });
  });
});

describe("alerts router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(observabilityApi.getAlerts).mockResolvedValue(emptyAlertsResponse);
  });

  afterEach(() => {
    cleanup();
  });

  it("renders Alerts page at /observability/alerts", async () => {
    const memoryRouter = createMemoryRouter(router.routes, {
      initialEntries: ["/observability/alerts"],
    });

    render(<RouterProvider router={memoryRouter} />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Alerts" })).toBeInTheDocument();
    });
  });
});
