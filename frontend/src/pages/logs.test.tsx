import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { MAIN_SCROLL_CONTAINER_ID } from "@/components/reliability/back-to-top-button";
import { ApiError } from "@/lib/api/client";
import * as observabilityApi from "@/lib/api/observability";
import { LogsPage } from "@/pages/logs";

vi.mock("@/lib/api/observability", () => ({
  getLogs: vi.fn(),
}));

const logsResponse = {
  checked_at: "2026-09-17T15:30:00.000Z",
  service: "user-service",
  limit: 50,
  logs: [
    {
      timestamp: "2026-09-17T15:29:55.000Z",
      level: "INFO",
      service: "user-service",
      logger: "uvicorn.access",
      message: "GET /health",
      method: "GET",
      path: "/health",
      status_code: 200,
      trace_id: "trace-abc-123",
      span_id: "span-def-456",
    },
    {
      timestamp: "2026-09-17T15:29:50.000Z",
      level: "ERROR",
      service: "user-service",
      logger: "app.main",
      message: "request failed",
      method: null,
      path: null,
      status_code: null,
      trace_id: null,
      span_id: null,
    },
    {
      timestamp: "2026-09-17T15:29:45.000Z",
      level: "INFO",
      service: "user-service",
      logger: "uvicorn.access",
      message: "POST /users",
      method: "POST",
      path: "/users",
      status_code: 201,
      trace_id: "trace-xyz-789",
      span_id: null,
    },
  ],
};

function renderLogsPage(initialEntry = "/observability/logs") {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/observability/logs" element={<LogsPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("LogsPage", () => {
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

  it("shows service selection when no valid service is in the URL", () => {
    renderLogsPage();

    expect(screen.getByText("Select a service to view logs")).toBeInTheDocument();
    expect(observabilityApi.getLogs).not.toHaveBeenCalled();
  });

  it("shows a loading state on first load", () => {
    vi.mocked(observabilityApi.getLogs).mockImplementation(
      () => new Promise(() => undefined),
    );

    renderLogsPage("/observability/logs?service=user-service");

    expect(screen.getByText("Loading logs…")).toBeInTheDocument();
  });

  it("renders logs from the BFF", async () => {
    vi.mocked(observabilityApi.getLogs).mockResolvedValue(logsResponse);

    renderLogsPage("/observability/logs?service=user-service");

    await waitFor(() => {
      expect(screen.getByText("request failed")).toBeInTheDocument();
    });

    expect(screen.getAllByText("GET /health").length).toBeGreaterThan(0);
    expect(screen.getByText(/trace-abc-123/)).toBeInTheDocument();
    expect(screen.getByText(/span-def-456/)).toBeInTheDocument();
    expect(observabilityApi.getLogs).toHaveBeenCalledWith("user-service", 50);
  });

  it("loads logs from the service query parameter", async () => {
    vi.mocked(observabilityApi.getLogs).mockResolvedValue({
      ...logsResponse,
      service: "order-service",
    });

    renderLogsPage("/observability/logs?service=order-service");

    await waitFor(() => {
      expect(observabilityApi.getLogs).toHaveBeenCalledWith("order-service", 50);
    });
  });

  it("updates the URL when the service selector changes", async () => {
    vi.mocked(observabilityApi.getLogs).mockResolvedValue(logsResponse);
    const user = userEvent.setup();

    renderLogsPage("/observability/logs?service=user-service");

    await waitFor(() => {
      expect(screen.getByLabelText("Service")).toBeInTheDocument();
    });

    await user.selectOptions(screen.getByLabelText("Service"), "payment-service");

    await waitFor(() => {
      expect(observabilityApi.getLogs).toHaveBeenCalledWith("payment-service", 50);
    });
  });

  it("filters logs locally by search query", async () => {
    vi.mocked(observabilityApi.getLogs).mockResolvedValue(logsResponse);
    const user = userEvent.setup();

    renderLogsPage("/observability/logs?service=user-service");

    await waitFor(() => {
      expect(screen.getByText(/trace-xyz-789/)).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText("Filter logs"), "request failed");

    expect(screen.queryByText(/trace-xyz-789/)).not.toBeInTheDocument();
    expect(screen.getByText("request failed")).toBeInTheDocument();
    expect(observabilityApi.getLogs).toHaveBeenCalledTimes(1);
  });

  it("filters logs locally by level", async () => {
    vi.mocked(observabilityApi.getLogs).mockResolvedValue(logsResponse);
    const user = userEvent.setup();

    renderLogsPage("/observability/logs?service=user-service");

    await waitFor(() => {
      expect(screen.getByLabelText("Level")).toBeInTheDocument();
    });

    await user.selectOptions(screen.getByLabelText("Level"), "ERROR");

    expect(screen.getByText("request failed")).toBeInTheDocument();
    expect(screen.queryByText("POST /users")).not.toBeInTheDocument();
  });

  it("shows an empty state when Loki returns zero logs", async () => {
    vi.mocked(observabilityApi.getLogs).mockResolvedValue({
      ...logsResponse,
      logs: [],
    });

    renderLogsPage("/observability/logs?service=user-service");

    await waitFor(() => {
      expect(
        screen.getByText("No logs found for this service in the last 15 minutes."),
      ).toBeInTheDocument();
    });
  });

  it("shows an error state with retry when the BFF fails", async () => {
    vi.mocked(observabilityApi.getLogs).mockRejectedValue(
      new ApiError("Loki unavailable", 502, "UPSTREAM_UNAVAILABLE"),
    );

    renderLogsPage("/observability/logs?service=user-service");

    await waitFor(() => {
      expect(screen.getByText("Loki unavailable")).toBeInTheDocument();
    });

    expect(screen.getByRole("button", { name: /Retry/i })).toBeInTheDocument();
  });

  it("links back to metrics with the selected service", async () => {
    vi.mocked(observabilityApi.getLogs).mockResolvedValue(logsResponse);

    renderLogsPage("/observability/logs?service=user-service");

    await waitFor(() => {
      expect(screen.getByRole("link", { name: /Metrics/i })).toHaveAttribute(
        "href",
        "/observability/metrics?service=user-service",
      );
    });
  });

  it("shows LIVE when logs polling succeeds", async () => {
    vi.mocked(observabilityApi.getLogs).mockResolvedValue(logsResponse);

    renderLogsPage("/observability/logs?service=user-service");

    await waitFor(() => {
      expect(screen.getByRole("status", { name: "Live" })).toBeInTheDocument();
    });
  });

  it("shows DISCONNECTED when logs polling fails", async () => {
    vi.mocked(observabilityApi.getLogs).mockRejectedValue(
      new ApiError("Loki unavailable", 502, "UPSTREAM_UNAVAILABLE"),
    );

    renderLogsPage("/observability/logs?service=user-service");

    await waitFor(() => {
      expect(screen.getByRole("status", { name: "Disconnected" })).toBeInTheDocument();
    });

    expect(screen.queryByRole("status", { name: "Live" })).not.toBeInTheDocument();
  });

  it("shows Back to top after meaningful scroll and scrolls to the top when clicked", async () => {
    const user = userEvent.setup();
    vi.mocked(observabilityApi.getLogs).mockResolvedValue(logsResponse);

    const scrollContainer = document.createElement("main");
    scrollContainer.id = MAIN_SCROLL_CONTAINER_ID;
    const scrollTo = vi.fn();
    scrollContainer.scrollTo = scrollTo;
    document.body.appendChild(scrollContainer);

    renderLogsPage("/observability/logs?service=user-service");

    await waitFor(() => {
      expect(screen.getByText("request failed")).toBeInTheDocument();
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
