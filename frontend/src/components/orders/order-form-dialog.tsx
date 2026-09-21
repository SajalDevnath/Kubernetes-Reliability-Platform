import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api/client";
import type { Order, OrderCreateInput, OrderStatus, OrderUpdateInput } from "@/lib/api/types";
import { createOrder, updateOrder } from "@/lib/api/orders";

const ORDER_STATUSES: OrderStatus[] = ["pending", "paid", "cancelled"];

interface OrderFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order?: Order | null;
  onSuccess: (message: string) => void;
}

export function OrderFormDialog({
  open,
  onOpenChange,
  order,
  onSuccess,
}: OrderFormDialogProps) {
  const isEdit = Boolean(order);
  const [userId, setUserId] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [status, setStatus] = useState<OrderStatus>("pending");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setUserId(order ? String(order.user_id) : "");
      setTotalAmount(order?.total_amount ?? "");
      setStatus(order?.status ?? "pending");
      setError(null);
    }
  }, [open, order]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      if (isEdit && order) {
        const input: OrderUpdateInput = {
          status,
          total_amount: totalAmount.trim(),
        };
        await updateOrder(order.id, input);
        onSuccess(`Updated order ${order.id}.`);
      } else {
        const input: OrderCreateInput = {
          user_id: Number.parseInt(userId, 10),
          total_amount: totalAmount.trim(),
        };
        const created = await createOrder(input);
        onSuccess(`Created order ${created.id}.`);
      }
      onOpenChange(false);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Unable to save order. Check the Order Service connection.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit order" : "Create order"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update mutable fields for this pending order."
              : "Create an order through the Order Service."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isEdit ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="user_id">User ID</Label>
                <Input
                  id="user_id"
                  name="user_id"
                  type="number"
                  min={1}
                  step={1}
                  value={userId}
                  onChange={(event) => setUserId(event.target.value)}
                  required
                  disabled={submitting}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="total_amount">Total amount</Label>
                <Input
                  id="total_amount"
                  name="total_amount"
                  type="number"
                  min={0.01}
                  step={0.01}
                  value={totalAmount}
                  onChange={(event) => setTotalAmount(event.target.value)}
                  required
                  disabled={submitting}
                />
              </div>

              <p className="text-xs text-muted-foreground">
                Creating an order invokes the Payment Service through the Order
                Service.
              </p>
            </>
          ) : (
            <>
              <div className="rounded-md border border-border bg-muted/30 px-4 py-3 text-sm">
                <p className="font-mono text-xs text-muted-foreground">
                  Order ID {order?.id} · User ID {order?.user_id}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <select
                  id="status"
                  name="status"
                  value={status}
                  onChange={(event) => setStatus(event.target.value as OrderStatus)}
                  disabled={submitting}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {ORDER_STATUSES.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit_total_amount">Total amount</Label>
                <Input
                  id="edit_total_amount"
                  name="total_amount"
                  type="number"
                  min={0.01}
                  step={0.01}
                  value={totalAmount}
                  onChange={(event) => setTotalAmount(event.target.value)}
                  required
                  disabled={submitting}
                />
              </div>
            </>
          )}

          {error ? (
            <p className="text-sm text-destructive" role="alert">{error}</p>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving…" : isEdit ? "Save changes" : "Create order"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
