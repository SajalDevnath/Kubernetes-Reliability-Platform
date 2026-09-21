import {
  AlertCircle,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  ShoppingCart,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { DeleteOrderDialog } from "@/components/orders/delete-order-dialog";
import { OrderFormDialog } from "@/components/orders/order-form-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api/client";
import type { Order, OrderStatus } from "@/lib/api/types";
import { listOrders } from "@/lib/api/orders";
import { formatAmount, formatDateTime } from "@/lib/format";

type LoadState = "loading" | "success" | "error";

function statusVariant(
  status: OrderStatus,
): "warning" | "success" | "destructive" {
  switch (status) {
    case "pending":
      return "warning";
    case "paid":
      return "success";
    case "cancelled":
      return "destructive";
  }
}

export function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [editOrder, setEditOrder] = useState<Order | null>(null);
  const [deleteOrder, setDeleteOrder] = useState<Order | null>(null);

  const loadOrders = useCallback(async () => {
    setLoadState("loading");
    setErrorMessage(null);

    try {
      const data = await listOrders();
      setOrders(data);
      setLoadState("success");
    } catch (err) {
      setOrders([]);
      setLoadState("error");
      if (err instanceof ApiError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage(
          "Unable to reach the Order Service. Ensure the backend is running and the development proxy is configured.",
        );
      }
    }
  }, []);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  function handleSuccess(message: string) {
    setSuccessMessage(message);
    void loadOrders();
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <header className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
            Orders
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">
            Inspect and manage orders exposed by the Order Service. Creating an
            order invokes the Payment Service synchronously through the Order
            Service.
          </p>
        </div>
        <Button
          onClick={() => setCreateOpen(true)}
          className="shrink-0"
          disabled={loadState === "loading"}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Create order
        </Button>
      </header>

      {successMessage ? (
        <div
          className="flex items-center justify-between gap-3 rounded-md border border-success/30 bg-success/10 px-4 py-3 text-sm text-success"
          role="status"
        >
          <span>{successMessage}</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-success hover:text-success"
            onClick={() => setSuccessMessage(null)}
          >
            Dismiss
          </Button>
        </div>
      ) : null}

      {loadState === "loading" ? (
        <div
          className="flex flex-col items-center justify-center gap-3 rounded-lg border border-border bg-muted/20 px-6 py-16 text-center"
          aria-busy="true"
          aria-live="polite"
        >
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading orders…</p>
        </div>
      ) : null}

      {loadState === "error" ? (
        <div
          className="flex flex-col items-center justify-center gap-4 rounded-lg border border-destructive/30 bg-destructive/5 px-6 py-12 text-center"
          role="alert"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-md border border-destructive/30 bg-card">
            <AlertCircle className="h-5 w-5 text-destructive" aria-hidden="true" />
          </div>
          <div className="space-y-2">
            <h2 className="text-sm font-medium text-foreground">
              Unable to load orders
            </h2>
            <p className="max-w-md text-sm text-muted-foreground">
              {errorMessage ??
                "The Order Service API is unavailable. Check that the service is running on port 8002."}
            </p>
          </div>
          <Button variant="outline" onClick={() => void loadOrders()}>
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Retry
          </Button>
        </div>
      ) : null}

      {loadState === "success" && orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-border bg-muted/20 px-6 py-12 text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-md border border-border bg-card">
            <ShoppingCart className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
          </div>
          <div className="space-y-2">
            <h2 className="text-sm font-medium text-foreground">No orders yet</h2>
            <p className="max-w-md text-sm text-muted-foreground">
              The Order Service returned an empty list. Create the first order
              to get started.
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Create order
          </Button>
        </div>
      ) : null}

      {loadState === "success" && orders.length > 0 ? (
        <div className="overflow-hidden rounded-lg border border-border">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-3 font-medium text-muted-foreground">ID</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">User ID</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Amount</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Created</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr
                    key={order.id}
                    className="border-b border-border last:border-b-0 hover:bg-muted/20"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      {order.id}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      {order.user_id}
                    </td>
                    <td className="px-4 py-3 text-foreground">
                      {formatAmount(order.total_amount)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={statusVariant(order.status)}>
                        {order.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDateTime(order.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        {order.status === "pending" ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditOrder(order)}
                            aria-label={`Edit order ${order.id}`}
                          >
                            <Pencil className="h-4 w-4" aria-hidden="true" />
                            Edit
                          </Button>
                        ) : null}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleteOrder(order)}
                          aria-label={`Delete order ${order.id}`}
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      <OrderFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={handleSuccess}
      />

      <OrderFormDialog
        open={editOrder !== null}
        onOpenChange={(open) => {
          if (!open) {
            setEditOrder(null);
          }
        }}
        order={editOrder}
        onSuccess={handleSuccess}
      />

      <DeleteOrderDialog
        order={deleteOrder}
        open={deleteOrder !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteOrder(null);
          }
        }}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
