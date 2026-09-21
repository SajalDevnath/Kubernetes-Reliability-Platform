import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api/client";
import type { Payment } from "@/lib/api/types";
import * as paymentsApi from "@/lib/api/payments";
import { PaymentsPage } from "@/pages/payments";

vi.mock("@/lib/api/payments", () => ({
  listPayments: vi.fn(),
  createPayment: vi.fn(),
  updatePayment: vi.fn(),
  deletePayment: vi.fn(),
  getPayment: vi.fn(),
}));

const mockPendingPayment: Payment = {
  id: 1,
  order_id: 42,
  amount: "99.99",
  status: "pending",
  created_at: "2025-01-01T12:00:00.000Z",
  updated_at: "2025-01-01T12:00:00.000Z",
};

const mockSuccessfulPayment: Payment = {
  id: 2,
  order_id: 7,
  amount: "150.00",
  status: "successful",
  created_at: "2025-01-02T12:00:00.000Z",
  updated_at: "2025-01-02T12:00:00.000Z",
};

function renderPaymentsPage() {
  return render(
    <MemoryRouter>
      <PaymentsPage />
    </MemoryRouter>,
  );
}

describe("PaymentsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("shows a loading state while payments are being fetched", () => {
    vi.mocked(paymentsApi.listPayments).mockImplementation(
      () =>
        new Promise(() => {
          // Intentionally unresolved to keep loading state visible.
        }),
    );

    renderPaymentsPage();

    expect(screen.getByText("Loading payments…")).toBeInTheDocument();
    expect(screen.queryByText("$99.99")).not.toBeInTheDocument();
  });

  it("renders payments returned by the API", async () => {
    vi.mocked(paymentsApi.listPayments).mockResolvedValue([mockPendingPayment]);

    renderPaymentsPage();

    await waitFor(() => {
      expect(screen.getByText("$99.99")).toBeInTheDocument();
    });

    expect(screen.getByText("pending")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edit payment 1" })).toBeInTheDocument();
  });

  it("shows an empty state when no payments exist", async () => {
    vi.mocked(paymentsApi.listPayments).mockResolvedValue([]);

    renderPaymentsPage();

    await waitFor(() => {
      expect(screen.getByText("No payments yet")).toBeInTheDocument();
    });

    expect(screen.getAllByRole("button", { name: "Create payment" }).length).toBeGreaterThan(0);
  });

  it("shows an error state when the API request fails", async () => {
    vi.mocked(paymentsApi.listPayments).mockRejectedValue(
      new ApiError("Service unavailable", 503),
    );

    renderPaymentsPage();

    await waitFor(() => {
      expect(screen.getByText("Unable to load payments")).toBeInTheDocument();
    });

    expect(screen.getByText("Service unavailable")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });

  it("creates a payment and refreshes the list", async () => {
    const user = userEvent.setup();
    const createdPayment: Payment = {
      ...mockPendingPayment,
      id: 3,
      order_id: 10,
      amount: "25.55",
    };

    vi.mocked(paymentsApi.listPayments)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([createdPayment]);
    vi.mocked(paymentsApi.createPayment).mockResolvedValue(createdPayment);

    renderPaymentsPage();

    await waitFor(() => {
      expect(screen.getByText("No payments yet")).toBeInTheDocument();
    });

    await waitFor(() => {
      const createButtons = screen.getAllByRole("button", { name: "Create payment" });
      expect(createButtons.some((button) => !button.hasAttribute("disabled"))).toBe(true);
    });

    const createButtons = screen.getAllByRole("button", { name: "Create payment" });
    const enabledCreateButton =
      createButtons.find((button) => !button.hasAttribute("disabled")) ??
      createButtons[createButtons.length - 1];
    await user.click(enabledCreateButton);

    const dialog = await screen.findByRole("dialog");
    await user.type(within(dialog).getByLabelText("Order ID"), "10");
    await user.type(within(dialog).getByLabelText("Amount"), "25.55");
    await user.click(
      within(dialog).getByRole("button", { name: "Create payment" }),
    );

    await waitFor(() => {
      expect(paymentsApi.createPayment).toHaveBeenCalledWith({
        order_id: 10,
        amount: "25.55",
      });
    });

    await waitFor(() => {
      expect(screen.getByText("$25.55")).toBeInTheDocument();
    });
  });

  it("requires confirmation before deleting a payment", async () => {
    const user = userEvent.setup();

    vi.mocked(paymentsApi.listPayments).mockResolvedValue([mockPendingPayment]);

    renderPaymentsPage();

    await waitFor(() => {
      expect(screen.getByText("$99.99")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Delete payment 1" }));

    const dialog = screen.getByRole("dialog");
    expect(
      within(dialog).getByRole("heading", { name: "Delete payment" }),
    ).toBeInTheDocument();
    expect(within(dialog).getByText(/Order ID 42/)).toBeInTheDocument();
    expect(paymentsApi.deletePayment).not.toHaveBeenCalled();

    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    expect(paymentsApi.deletePayment).not.toHaveBeenCalled();
  });

  it("does not expose edit controls for terminal payment statuses", async () => {
    vi.mocked(paymentsApi.listPayments).mockResolvedValue([mockSuccessfulPayment]);

    renderPaymentsPage();

    await waitFor(() => {
      expect(screen.getByText("$150.00")).toBeInTheDocument();
    });

    expect(screen.queryByRole("button", { name: "Edit payment 2" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete payment 2" })).toBeInTheDocument();
  });
});
