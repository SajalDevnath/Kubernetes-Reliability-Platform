import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api/client";
import * as observabilityApi from "@/lib/api/observability";
import { TracesPage } from "@/pages/traces";

vi.mock("@/lib/api/observability", () => ({
  getTraces: vi.fn(),
  getTrace: vi.fn(),
}));

const tracesResponse = {
  checked_at: "2026-09-17T15:30:00.000Z",
  service: "user-service",
  limit: 20,
  traces: [
    {
      trace_id: "70da75c121a8e55fb8dc385971bbde24",
      service: "user-service",
      root_operation: "GET /health",
      start_time: "2026-09-17T15:29:55.000Z",
      duration_ms: 12,
    },
    {
      trace_id: "a1b2c3d4e5f6789012345678abcdef01",
      service: "order-service",
      root_operation: "POST /orders",
      start_time: "2026-09-17T15:29:50.000Z",
      duration_ms: 24,
    },
  ],
};

const traceDetailResponse = {
  checked_at: "2026-09-17T15:30:05.000Z",
  trace_id: "70da75c121a8e55fb8dc385971bbde24",
  service: "user-service",
  spans: [
    {
      span_id: "root-span",
      parent_span_id: null,
      name: "GET /health",
      kind: "SERVER",
      start_time: "2026-09-17T15:29:55.000Z",
      end_time: "2026-09-17T15:29:55.012Z",
      duration_ms: 12,
      status: "OK",
      attributes: {
        "http.method": "GET",
        "http.route": "/health",
        "http.status_code": 200,
      },
    },
    {
      span_id: "child-span",
      parent_span_id: "root-span",
      name: "GET /health http send",
      kind: "CLIENT",
      start_time: "2026-09-17T15:29:55.002Z",
      end_time: "2026-09-17T15:29:55.010Z",
      duration_ms: 8,
      status: "OK",
      attributes: {} as Record<string, string | number | boolean | null>,
    },
  ],
};

function renderTracesPage(initialEntry = "/observability/traces") {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/observability/traces" element={<TracesPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

function mockSuccessfulTraces() {
  vi.mocked(observabilityApi.getTraces).mockResolvedValue(tracesResponse);
  vi.mocked(observabilityApi.getTrace).mockResolvedValue(traceDetailResponse);
}

describe("TracesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("shows a loading state on first load", () => {
    mockSuccessfulTraces();
    vi.mocked(observabilityApi.getTraces).mockImplementation(
      () => new Promise(() => undefined),
    );

    renderTracesPage();

    expect(screen.getByText("Loading traces…")).toBeInTheDocument();
  });

  it("renders traces from the BFF", async () => {
    mockSuccessfulTraces();
    renderTracesPage("/observability/traces?service=user-service");

    await waitFor(() => {
      expect(screen.getByText("GET /health")).toBeInTheDocument();
    });

    expect(screen.getByText("POST /orders")).toBeInTheDocument();
    expect(observabilityApi.getTraces).toHaveBeenCalledWith("user-service", 20);
  });

  it("loads traces from the service query parameter", async () => {
    mockSuccessfulTraces();
    renderTracesPage("/observability/traces?service=order-service");

    await waitFor(() => {
      expect(observabilityApi.getTraces).toHaveBeenCalledWith("order-service", 20);
    });
  });

  it("updates the URL when the service filter changes", async () => {
    mockSuccessfulTraces();
    const user = userEvent.setup();
    renderTracesPage();

    await waitFor(() => {
      expect(screen.getByLabelText("Service filter")).toBeInTheDocument();
    });

    await user.selectOptions(screen.getByLabelText("Service filter"), "payment-service");

    await waitFor(() => {
      expect(observabilityApi.getTraces).toHaveBeenCalledWith("payment-service", 20);
    });
  });

  it("filters traces locally by search query", async () => {
    mockSuccessfulTraces();
    const user = userEvent.setup();
    renderTracesPage();

    await waitFor(() => {
      expect(screen.getByText("POST /orders")).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText("Filter traces"), "70da75c121");

    expect(screen.getByText("GET /health")).toBeInTheDocument();
    expect(screen.queryByText("POST /orders")).not.toBeInTheDocument();
    expect(observabilityApi.getTraces).toHaveBeenCalledTimes(1);
  });

  it("shows an empty state when no traces are returned", async () => {
    mockSuccessfulTraces();
    vi.mocked(observabilityApi.getTraces).mockResolvedValue({
      ...tracesResponse,
      traces: [],
    });

    renderTracesPage("/observability/traces?service=user-service");

    await waitFor(() => {
      expect(
        screen.getByText("No traces found for the selected service."),
      ).toBeInTheDocument();
    });
  });

  it("shows trace detail empty state before selection", async () => {
    mockSuccessfulTraces();
    renderTracesPage();

    await waitFor(() => {
      expect(screen.getByText("Select a trace to inspect its spans.")).toBeInTheDocument();
    });
  });

  it("loads and renders trace detail when a trace is selected", async () => {
    mockSuccessfulTraces();
    const user = userEvent.setup();
    renderTracesPage();

    await waitFor(() => {
      expect(screen.getByText("GET /health")).toBeInTheDocument();
    });

    await user.click(screen.getByText("70da75c121a8e55fb8dc385971bbde24"));

    await waitFor(() => {
      expect(observabilityApi.getTrace).toHaveBeenCalledWith(
        "70da75c121a8e55fb8dc385971bbde24",
      );
    });

    expect(screen.getByText("Trace detail")).toBeInTheDocument();
    expect(screen.getByText("GET /health http send")).toBeInTheDocument();
    expect(screen.getAllByText("GET /health").length).toBeGreaterThan(0);
  });

  it("shows trace detail error state with retry", async () => {
    mockSuccessfulTraces();
    vi.mocked(observabilityApi.getTrace).mockRejectedValue(
      new ApiError("Tempo unavailable", 502, "UPSTREAM_UNAVAILABLE"),
    );
    const user = userEvent.setup();
    renderTracesPage();

    await waitFor(() => {
      expect(screen.getByText("GET /health")).toBeInTheDocument();
    });

    await user.click(screen.getByText("70da75c121a8e55fb8dc385971bbde24"));

    await waitFor(() => {
      expect(screen.getByText("Tempo unavailable")).toBeInTheDocument();
    });

    expect(screen.getByRole("button", { name: /Retry/i })).toBeInTheDocument();
  });

  it("shows LIVE when trace polling succeeds", async () => {
    mockSuccessfulTraces();
    renderTracesPage();

    await waitFor(() => {
      expect(screen.getByRole("status", { name: "Live" })).toBeInTheDocument();
    });
  });

  it("shows DISCONNECTED when trace polling fails", async () => {
    mockSuccessfulTraces();
    vi.mocked(observabilityApi.getTraces).mockRejectedValue(
      new ApiError("Tempo unavailable", 502, "UPSTREAM_UNAVAILABLE"),
    );

    renderTracesPage();

    await waitFor(() => {
      expect(screen.getByRole("status", { name: "Disconnected" })).toBeInTheDocument();
    });

    expect(screen.queryByRole("status", { name: "Live" })).not.toBeInTheDocument();
  });
});
