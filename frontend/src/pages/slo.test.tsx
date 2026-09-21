import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";

import { SloPage } from "@/pages/slo";

function renderSloPage() {
  return render(
    <MemoryRouter>
      <SloPage />
    </MemoryRouter>,
  );
}

describe("SloPage", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders the SLO page", () => {
    renderSloPage();

    expect(screen.getByRole("heading", { name: "SLOs" })).toBeInTheDocument();
  });

  it("displays the 99% availability target", () => {
    renderSloPage();

    expect(screen.getByText("99%")).toBeInTheDocument();
    expect(screen.getByText("Availability target")).toBeInTheDocument();
    expect(screen.getAllByText("Configured target").length).toBeGreaterThan(0);
  });

  it("displays the 6-hour rolling window", () => {
    renderSloPage();

    expect(screen.getByText("6 hours")).toBeInTheDocument();
    expect(screen.getByText("Measurement window")).toBeInTheDocument();
    expect(screen.getByText(/rolling 6-hour window/i)).toBeInTheDocument();
  });

  it("displays the P95 latency target of <= 500 ms", () => {
    renderSloPage();

    expect(screen.getByText("≤ 500 ms")).toBeInTheDocument();
    expect(screen.getByText("P95 latency target")).toBeInTheDocument();
  });

  it("displays the error-budget explanation", () => {
    renderSloPage();

    expect(
      screen.getByText(/amount of unreliability permitted by the availability objective/i),
    ).toBeInTheDocument();
    expect(screen.getByText("1% allowed failure")).toBeInTheDocument();
    expect(screen.getAllByText("Error budget").length).toBeGreaterThan(0);
  });

  it("represents existing reliability signals", () => {
    renderSloPage();

    expect(screen.getByText("KRPSLOAvailabilityViolation")).toBeInTheDocument();
    expect(screen.getByText("KRPSLOErrorBudgetExhausted")).toBeInTheDocument();
    expect(screen.getByText("KRPHighP95Latency")).toBeInTheDocument();
    expect(screen.getByText("Availability violation")).toBeInTheDocument();
    expect(screen.getByText("Error budget exhausted")).toBeInTheDocument();
    expect(screen.getByText("High P95 latency")).toBeInTheDocument();
  });

  it("provides Grafana SRE dashboard navigation", () => {
    renderSloPage();

    const dashboardLink = screen.getByRole("link", { name: /Open SRE dashboard/i });
    expect(dashboardLink).toHaveAttribute("href", "/observability/metrics?dashboard=krp-sre");
    expect(screen.getAllByText(/KRP SRE/i).length).toBeGreaterThan(0);
  });

  it("does not render fabricated current SLO values", () => {
    renderSloPage();

    expect(screen.queryByText("99.97%")).not.toBeInTheDocument();
    expect(screen.queryByText(/budget remaining/i)).not.toBeInTheDocument();
    expect(screen.queryByText("120 ms")).not.toBeInTheDocument();
    expect(screen.queryByText(/COMPLIANT/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^Healthy$/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Live measurements are available in Grafana/i)).toBeInTheDocument();
  });
});
