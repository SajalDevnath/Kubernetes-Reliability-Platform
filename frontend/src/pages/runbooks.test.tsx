import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, MemoryRouter, Route, RouterProvider, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { MAIN_SCROLL_CONTAINER_ID } from "@/components/reliability/back-to-top-button";
import { incidentScenarios } from "@/lib/incidents-catalog";
import { RunbooksPage } from "@/pages/runbooks";

function renderRunbooksPage(initialEntry = "/reliability/runbooks") {
  const router = createMemoryRouter(
    [{ path: "/reliability/runbooks", element: <RunbooksPage /> }],
    { initialEntries: [initialEntry] },
  );

  return render(<RouterProvider router={router} />);
}

describe("RunbooksPage", () => {
  beforeEach(() => {
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

  it("renders the runbook catalog with all three runbooks", () => {
    renderRunbooksPage();

    expect(screen.getByRole("heading", { name: "Runbooks" })).toBeInTheDocument();
    expect(screen.getByText("PostgreSQL Dependency Failure")).toBeInTheDocument();
    expect(screen.getByText("Payment Dependency Failure")).toBeInTheDocument();
    expect(screen.getByText("Application Pod Crash")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /Open runbook/i }).length).toBe(3);
  });

  it("opens the PostgreSQL runbook through its query parameter", () => {
    renderRunbooksPage("/reliability/runbooks?runbook=postgres-dependency-failure");

    expect(
      screen.getByRole("heading", { name: "PostgreSQL Dependency Failure" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Documented runbook")).toBeInTheDocument();
    expect(screen.getAllByText("KRPPostgresDown").length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: "Remediation and Recovery" })).toBeInTheDocument();
  });

  it("opens the Payment Dependency Failure runbook through its query parameter", () => {
    renderRunbooksPage("/reliability/runbooks?runbook=payment-dependency-failure");

    expect(
      screen.getByRole("heading", { name: "Payment Dependency Failure" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/HTTP 502, 503, or 504/i)).toBeInTheDocument();
    expect(screen.getAllByText("KRPServiceTargetDown").length).toBeGreaterThan(0);
  });

  it("opens the Application Pod Crash runbook through its query parameter", () => {
    renderRunbooksPage("/reliability/runbooks?runbook=application-pod-crash");

    expect(screen.getByRole("heading", { name: "Application Pod Crash" })).toBeInTheDocument();
    expect(screen.getByText(/symptom-first/i)).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Remediation and Recovery" }),
    ).toBeInTheDocument();
  });

  it("shows a not-found state for an invalid runbook id", () => {
    renderRunbooksPage("/reliability/runbooks?runbook=unknown-runbook");

    expect(screen.getByRole("heading", { name: "Runbook not found" })).toBeInTheDocument();
    expect(screen.getByText("unknown-runbook")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Return to runbook catalog" }),
    ).toHaveAttribute("href", "/reliability/runbooks");
  });

  it("contains important source-backed runbook sections", () => {
    renderRunbooksPage("/reliability/runbooks?runbook=postgres-dependency-failure");

    expect(screen.getByRole("heading", { name: "Purpose" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Symptoms" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Investigation" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Verification" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Escalation" })).toBeInTheDocument();
  });

  it("renders a visible Back to Runbooks control on runbook detail pages", () => {
    renderRunbooksPage("/reliability/runbooks?runbook=payment-dependency-failure");

    const backLink = screen.getByRole("link", { name: /Back to Runbooks/i });
    expect(backLink).toBeVisible();
    expect(backLink).toHaveAttribute("href", "/reliability/runbooks");
  });

  it("returns to the runbook catalog when Back to Runbooks is clicked", async () => {
    render(
      <MemoryRouter
        initialEntries={["/reliability/runbooks?runbook=postgres-dependency-failure"]}
      >
        <Routes>
          <Route path="/reliability/runbooks" element={<RunbooksPage />} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("link", { name: /Back to Runbooks/i }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Runbooks" })).toBeInTheDocument();
    });
    expect(screen.queryByRole("link", { name: /Back to Runbooks/i })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Runbook catalog" })).toBeInTheDocument();
  });

  it("shows Back to top after meaningful scroll and scrolls to the top when clicked", async () => {
    const user = userEvent.setup();

    const scrollContainer = document.createElement("main");
    scrollContainer.id = MAIN_SCROLL_CONTAINER_ID;
    const scrollTo = vi.fn();
    scrollContainer.scrollTo = scrollTo;
    document.body.appendChild(scrollContainer);

    renderRunbooksPage("/reliability/runbooks?runbook=postgres-dependency-failure");

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

  it("resolves existing Incident to Runbook deep links", () => {
    for (const scenario of incidentScenarios) {
      const runbookId = scenario.runbookHref.split("runbook=")[1];
      renderRunbooksPage(`/reliability/runbooks?runbook=${runbookId}`);
      expect(
        screen.getByRole("heading", { name: scenario.name }),
      ).toBeInTheDocument();
      cleanup();
    }
  });
});
