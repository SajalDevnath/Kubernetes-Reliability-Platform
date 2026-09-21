import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api/client";
import type { Order } from "@/lib/api/types";
import * as ordersApi from "@/lib/api/orders";
import { OrdersPage } from "@/pages/orders";

vi.mock("@/lib/api/orders", () => ({
  listOrders: vi.fn(),
  createOrder: vi.fn(),
  updateOrder: vi.fn(),
  deleteOrder: vi.fn(),
  getOrder: vi.fn(),
}));

const mockPendingOrder: Order = {
  id: 1,
  user_id: 42,
  status: "pending",
  total_amount: "99.99",
  created_at: "2025-01-01T12:00:00.000Z",
  updated_at: "2025-01-01T12:00:00.000Z",
};

const mockPaidOrder: Order = {
  id: 2,
  user_id: 7,
  status: "paid",
  total_amount: "150.00",
  created_at: "2025-01-02T12:00:00.000Z",
  updated_at: "2025-01-02T12:00:00.000Z",
};

function renderOrdersPage() {
  return render(
    <MemoryRouter>
      <OrdersPage />
    </MemoryRouter>,
  );
}

describe("OrdersPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("shows a loading state while orders are being fetched", () => {
    vi.mocked(ordersApi.listOrders).mockImplementation(
      () =>
        new Promise(() => {
          // Intentionally unresolved to keep loading state visible.
        }),
    );

    renderOrdersPage();

    expect(screen.getByText("Loading orders…")).toBeInTheDocument();
    expect(screen.queryByText("99.99")).not.toBeInTheDocument();
  });

  it("renders orders returned by the API", async () => {
    vi.mocked(ordersApi.listOrders).mockResolvedValue([mockPendingOrder]);

    renderOrdersPage();

    await waitFor(() => {
      expect(screen.getByText("$99.99")).toBeInTheDocument();
    });

    expect(screen.getByText("pending")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edit order 1" })).toBeInTheDocument();
  });

  it("shows an empty state when no orders exist", async () => {
    vi.mocked(ordersApi.listOrders).mockResolvedValue([]);

    renderOrdersPage();

    await waitFor(() => {
      expect(screen.getByText("No orders yet")).toBeInTheDocument();
    });

    expect(screen.getAllByRole("button", { name: "Create order" }).length).toBeGreaterThan(0);
  });

  it("shows an error state when the API request fails", async () => {
    vi.mocked(ordersApi.listOrders).mockRejectedValue(
      new ApiError("Service unavailable", 503),
    );

    renderOrdersPage();

    await waitFor(() => {
      expect(screen.getByText("Unable to load orders")).toBeInTheDocument();
    });

    expect(screen.getByText("Service unavailable")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });

  it("creates an order and refreshes the list", async () => {
    const user = userEvent.setup();
    const createdOrder: Order = {
      ...mockPendingOrder,
      id: 3,
      user_id: 10,
      total_amount: "25.55",
    };

    vi.mocked(ordersApi.listOrders)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([createdOrder]);
    vi.mocked(ordersApi.createOrder).mockResolvedValue(createdOrder);

    renderOrdersPage();

    await waitFor(() => {
      expect(screen.getByText("No orders yet")).toBeInTheDocument();
    });

    await waitFor(() => {
      const createButtons = screen.getAllByRole("button", { name: "Create order" });
      expect(createButtons.some((button) => !button.hasAttribute("disabled"))).toBe(true);
    });

    const createButtons = screen.getAllByRole("button", { name: "Create order" });
    const enabledCreateButton =
      createButtons.find((button) => !button.hasAttribute("disabled")) ??
      createButtons[createButtons.length - 1];
    await user.click(enabledCreateButton);

    const dialog = await screen.findByRole("dialog");
    await user.type(within(dialog).getByLabelText("User ID"), "10");
    await user.type(within(dialog).getByLabelText("Total amount"), "25.55");
    await user.click(
      within(dialog).getByRole("button", { name: "Create order" }),
    );

    await waitFor(() => {
      expect(ordersApi.createOrder).toHaveBeenCalledWith({
        user_id: 10,
        total_amount: "25.55",
      });
    });

    await waitFor(() => {
      expect(screen.getByText("$25.55")).toBeInTheDocument();
    });
  });

  it("requires confirmation before deleting an order", async () => {
    const user = userEvent.setup();

    vi.mocked(ordersApi.listOrders).mockResolvedValue([mockPendingOrder]);

    renderOrdersPage();

    await waitFor(() => {
      expect(screen.getByText("$99.99")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Delete order 1" }));

    const dialog = screen.getByRole("dialog");
    expect(
      within(dialog).getByRole("heading", { name: "Delete order" }),
    ).toBeInTheDocument();
    expect(within(dialog).getByText(/User ID 42/)).toBeInTheDocument();
    expect(ordersApi.deleteOrder).not.toHaveBeenCalled();

    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    expect(ordersApi.deleteOrder).not.toHaveBeenCalled();
  });

  it("displays backend-provided error when order creation fails", async () => {
    const user = userEvent.setup();

    vi.mocked(ordersApi.listOrders).mockResolvedValue([]);
    vi.mocked(ordersApi.createOrder).mockRejectedValue(
      new ApiError("Payment Service is unavailable", 503),
    );

    renderOrdersPage();

    await waitFor(() => {
      expect(screen.getByText("No orders yet")).toBeInTheDocument();
    });

    const createButtons = screen.getAllByRole("button", { name: "Create order" });
    const enabledCreateButton =
      createButtons.find((button) => !button.hasAttribute("disabled")) ??
      createButtons[createButtons.length - 1];
    await user.click(enabledCreateButton);

    const dialog = await screen.findByRole("dialog");
    await user.type(within(dialog).getByLabelText("User ID"), "1");
    await user.type(within(dialog).getByLabelText("Total amount"), "10.00");
    await user.click(
      within(dialog).getByRole("button", { name: "Create order" }),
    );

    await waitFor(() => {
      expect(
        within(dialog).getByText("Payment Service is unavailable"),
      ).toBeInTheDocument();
    });

    expect(ordersApi.createOrder).toHaveBeenCalled();
    expect(screen.queryByText("Created order")).not.toBeInTheDocument();
  });

  it("does not expose edit controls for terminal order statuses", async () => {
    vi.mocked(ordersApi.listOrders).mockResolvedValue([mockPaidOrder]);

    renderOrdersPage();

    await waitFor(() => {
      expect(screen.getByText("$150.00")).toBeInTheDocument();
    });

    expect(screen.queryByRole("button", { name: "Edit order 2" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete order 2" })).toBeInTheDocument();
  });
});
