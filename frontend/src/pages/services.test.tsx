import { cleanup, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";

import { ServicesPage } from "@/pages/services";

function renderServicesPage() {
  return render(
    <MemoryRouter>
      <ServicesPage />
    </MemoryRouter>,
  );
}

describe("ServicesPage", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders all three application services", () => {
    renderServicesPage();

    expect(screen.getByRole("heading", { name: "Services" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "User Service" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Order Service" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Payment Service" })).toBeInTheDocument();
  });

  it("displays the User Service documented health endpoint", () => {
    renderServicesPage();

    const userCard = screen.getByRole("heading", { name: "User Service" }).closest("div.rounded-lg");
    expect(userCard).toBeTruthy();
    expect(within(userCard as HTMLElement).getByText("Process health: GET /health")).toBeInTheDocument();
  });

  it("displays Order Service operational check semantics", () => {
    renderServicesPage();

    expect(screen.getByText(/No dedicated health endpoint/i)).toBeInTheDocument();
    expect(screen.getByText(/Operational check: GET \/orders/i)).toBeInTheDocument();
  });

  it("displays the Payment Service documented health endpoint", () => {
    renderServicesPage();

    const paymentCards = screen.getAllByText("Payment Service");
    const paymentCard = paymentCards
      .map((node) => node.closest("[class*='rounded-lg']"))
      .find((card) => card && within(card as HTMLElement).queryByText("Process health: GET /health"));

    expect(paymentCard).toBeTruthy();
  });

  it("displays Order Service PostgreSQL and Payment Service dependencies", () => {
    renderServicesPage();

    const orderDependencyTree = screen.getByLabelText("Order Service dependencies");
    expect(within(orderDependencyTree).getByText("PostgreSQL")).toBeInTheDocument();
    expect(within(orderDependencyTree).getByText("Payment Service")).toBeInTheDocument();
  });

  it("provides observability navigation links", () => {
    renderServicesPage();

    expect(screen.getAllByRole("link", { name: "Metrics" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: "Logs" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: "Traces" }).length).toBeGreaterThan(0);

    const metricsLink = screen.getAllByRole("link", { name: "Metrics" })[0];
    expect(metricsLink).toHaveAttribute("href", "/observability/metrics");
  });

  it("does not render fabricated live health or metric values", () => {
    renderServicesPage();

    expect(screen.queryByText(/healthy/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/uptime/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/latency/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/cpu/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/memory/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/availability/i)).not.toBeInTheDocument();
    expect(screen.getAllByText("Documented").length).toBeGreaterThan(0);
  });
});
