import { cleanup, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";

import { IncidentsPage } from "@/pages/incidents";

function renderIncidentsPage() {
  return render(
    <MemoryRouter>
      <IncidentsPage />
    </MemoryRouter>,
  );
}

function getScenarioCard(name: string) {
  const heading = screen.getByRole("heading", { name });
  const card = heading.closest(".rounded-lg");
  expect(card).toBeTruthy();
  return within(card as HTMLElement);
}

describe("IncidentsPage", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders all three documented incident scenarios", () => {
    renderIncidentsPage();

    expect(screen.getByRole("heading", { name: "Incidents" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "PostgreSQL Dependency Failure" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Payment Dependency Failure" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Application Pod Crash" })).toBeInTheDocument();
    expect(screen.getAllByText("Documented scenario").length).toBe(3);
  });

  it("displays PostgreSQL dependency symptoms and signals", () => {
    renderIncidentsPage();

    const card = getScenarioCard("PostgreSQL Dependency Failure");

    expect(card.getByText(/pg_up can become 0/i)).toBeInTheDocument();
    expect(card.getByText(/Application health endpoints may still report the process as healthy/i)).toBeInTheDocument();
    expect(card.getByText("KRPPostgresDown")).toBeInTheDocument();
    expect(card.getByText("KRPPostgresExporterDown")).toBeInTheDocument();
  });

  it("displays Payment dependency behavior and signals", () => {
    renderIncidentsPage();

    const card = getScenarioCard("Payment Dependency Failure");

    expect(card.getByText(/POST \/orders returns HTTP 502, 503, or 504/i)).toBeInTheDocument();
    expect(card.getByText(/synchronously calls Payment Service/i)).toBeInTheDocument();
    expect(card.getByText("KRPHigh5xxErrorRate")).toBeInTheDocument();
    expect(card.getByText("KRPServiceTargetDown")).toBeInTheDocument();
  });

  it("displays Application Pod Crash self-healing and alert behavior", () => {
    renderIncidentsPage();

    const card = getScenarioCard("Application Pod Crash");

    expect(card.getByText(/Pod in Terminating, CrashLoopBackOff/i)).toBeInTheDocument();
    expect(card.getByText(/Kubernetes Deployment controller recreates the workload/i)).toBeInTheDocument();
    expect(card.getByText(/brief outages may not trigger alerts/i)).toBeInTheDocument();
    expect(card.getByText(/no alert may fire for a brief crash/i)).toBeInTheDocument();
  });

  it("links each scenario to the correct runbook", () => {
    renderIncidentsPage();

    const runbookLinks = screen.getAllByRole("link", { name: /Open runbook/i });
    expect(runbookLinks).toHaveLength(3);
    expect(runbookLinks[0]).toHaveAttribute(
      "href",
      "/reliability/runbooks?runbook=postgres-dependency-failure",
    );
    expect(runbookLinks[1]).toHaveAttribute(
      "href",
      "/reliability/runbooks?runbook=payment-dependency-failure",
    );
    expect(runbookLinks[2]).toHaveAttribute(
      "href",
      "/reliability/runbooks?runbook=application-pod-crash",
    );
  });

  it("provides working navigation links to existing frontend routes", () => {
    renderIncidentsPage();

    const servicesLinks = screen.getAllByRole("link", { name: "Services" });
    expect(servicesLinks[0]).toHaveAttribute("href", "/reliability/services");

    const metricsLinks = screen.getAllByRole("link", { name: "Metrics" });
    expect(metricsLinks.length).toBeGreaterThan(0);
    expect(metricsLinks[0].getAttribute("href")).toContain("/observability/metrics");

    const ordersLink = screen.getByRole("link", { name: "Orders" });
    expect(ordersLink).toHaveAttribute("href", "/orders");
  });

  it("does not present fake current incident state", () => {
    renderIncidentsPage();

    expect(screen.queryByText(/^Active$/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^Resolved$/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/currently firing/i)).not.toBeInTheDocument();
    expect(screen.getByText(/not whether an incident is currently active/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Documented alert names — not current firing state/i).length).toBe(3);
  });
});
