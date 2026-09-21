import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ApiError } from "@/lib/api/client";
import type { Payment } from "@/lib/api/types";
import { deletePayment } from "@/lib/api/payments";
import { formatAmount } from "@/lib/format";

interface DeletePaymentDialogProps {
  payment: Payment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (message: string) => void;
}

export function DeletePaymentDialog({
  payment,
  open,
  onOpenChange,
  onSuccess,
}: DeletePaymentDialogProps) {
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!payment) {
      return;
    }

    setError(null);
    setDeleting(true);

    try {
      await deletePayment(payment.id);
      onSuccess(`Deleted payment ${payment.id}.`);
      onOpenChange(false);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Unable to delete payment. Check the Payment Service connection.");
      }
    } finally {
      setDeleting(false);
    }
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setError(null);
    }
    onOpenChange(nextOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete payment</DialogTitle>
          <DialogDescription>
            This permanently removes the payment from the Payment Service. This
            action cannot be undone and does not affect the associated order.
          </DialogDescription>
        </DialogHeader>

        {payment ? (
          <div className="rounded-md border border-border bg-muted/30 px-4 py-3 text-sm">
            <p className="font-medium text-foreground">
              Payment {payment.id}
            </p>
            <p className="mt-1 text-muted-foreground">
              Order ID {payment.order_id} · {formatAmount(payment.amount)}
            </p>
            <p className="mt-1 font-mono text-xs text-muted-foreground">
              Status: {payment.status}
            </p>
          </div>
        ) : null}

        {error ? (
          <p className="text-sm text-destructive" role="alert">{error}</p>
        ) : null}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={deleting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={deleting || !payment}
          >
            {deleting ? "Deleting…" : "Delete payment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
