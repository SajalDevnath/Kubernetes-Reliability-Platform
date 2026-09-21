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
import type {
  Payment,
  PaymentCreateInput,
  PaymentStatus,
  PaymentUpdateInput,
} from "@/lib/api/types";
import { createPayment, updatePayment } from "@/lib/api/payments";

const PAYMENT_STATUSES: PaymentStatus[] = ["pending", "successful", "failed"];

interface PaymentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payment?: Payment | null;
  onSuccess: (message: string) => void;
}

export function PaymentFormDialog({
  open,
  onOpenChange,
  payment,
  onSuccess,
}: PaymentFormDialogProps) {
  const isEdit = Boolean(payment);
  const [orderId, setOrderId] = useState("");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState<PaymentStatus>("pending");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setOrderId(payment ? String(payment.order_id) : "");
      setAmount(payment?.amount ?? "");
      setStatus(payment?.status ?? "pending");
      setError(null);
    }
  }, [open, payment]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      if (isEdit && payment) {
        const input: PaymentUpdateInput = {
          status,
          amount: amount.trim(),
        };
        await updatePayment(payment.id, input);
        onSuccess(`Updated payment ${payment.id}.`);
      } else {
        const input: PaymentCreateInput = {
          order_id: Number.parseInt(orderId, 10),
          amount: amount.trim(),
        };
        const created = await createPayment(input);
        onSuccess(`Created payment ${created.id}.`);
      }
      onOpenChange(false);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Unable to save payment. Check the Payment Service connection.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit payment" : "Create payment"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update mutable fields for this pending payment. Changes here do not update the associated order."
              : "Create a payment record in the Payment Service."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isEdit ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="order_id">Order ID</Label>
                <Input
                  id="order_id"
                  name="order_id"
                  type="number"
                  min={1}
                  step={1}
                  value={orderId}
                  onChange={(event) => setOrderId(event.target.value)}
                  required
                  disabled={submitting}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  name="amount"
                  type="number"
                  min={0.01}
                  step={0.01}
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  required
                  disabled={submitting}
                />
              </div>

              <p className="text-xs text-muted-foreground">
                Payment records are managed independently from orders. Updating a
                payment does not change order status.
              </p>
            </>
          ) : (
            <>
              <div className="rounded-md border border-border bg-muted/30 px-4 py-3 text-sm">
                <p className="font-mono text-xs text-muted-foreground">
                  Payment ID {payment?.id} · Order ID {payment?.order_id}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <select
                  id="status"
                  name="status"
                  value={status}
                  onChange={(event) => setStatus(event.target.value as PaymentStatus)}
                  disabled={submitting}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {PAYMENT_STATUSES.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit_amount">Amount</Label>
                <Input
                  id="edit_amount"
                  name="amount"
                  type="number"
                  min={0.01}
                  step={0.01}
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
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
              {submitting ? "Saving…" : isEdit ? "Save changes" : "Create payment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
