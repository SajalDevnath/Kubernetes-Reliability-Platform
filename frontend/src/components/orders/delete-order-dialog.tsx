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
import type { Order } from "@/lib/api/types";
import { deleteOrder } from "@/lib/api/orders";
import { formatAmount } from "@/lib/format";

interface DeleteOrderDialogProps {
  order: Order | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (message: string) => void;
}

export function DeleteOrderDialog({
  order,
  open,
  onOpenChange,
  onSuccess,
}: DeleteOrderDialogProps) {
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!order) {
      return;
    }

    setError(null);
    setDeleting(true);

    try {
      await deleteOrder(order.id);
      onSuccess(`Deleted order ${order.id}.`);
      onOpenChange(false);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Unable to delete order. Check the Order Service connection.");
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
          <DialogTitle>Delete order</DialogTitle>
          <DialogDescription>
            This permanently removes the order from the Order Service. This
            action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        {order ? (
          <div className="rounded-md border border-border bg-muted/30 px-4 py-3 text-sm">
            <p className="font-medium text-foreground">
              Order {order.id}
            </p>
            <p className="mt-1 text-muted-foreground">
              User ID {order.user_id} · {formatAmount(order.total_amount)}
            </p>
            <p className="mt-1 font-mono text-xs text-muted-foreground">
              Status: {order.status}
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
            disabled={deleting || !order}
          >
            {deleting ? "Deleting…" : "Delete order"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
