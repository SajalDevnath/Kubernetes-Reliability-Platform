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
import type { User } from "@/lib/api/types";
import { deleteUser } from "@/lib/api/users";

interface DeleteUserDialogProps {
  user: User | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (message: string) => void;
}

export function DeleteUserDialog({
  user,
  open,
  onOpenChange,
  onSuccess,
}: DeleteUserDialogProps) {
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!user) {
      return;
    }

    setError(null);
    setDeleting(true);

    try {
      await deleteUser(user.id);
      onSuccess(`Deleted user ${user.full_name}.`);
      onOpenChange(false);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Unable to delete user. Check the User Service connection.");
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
          <DialogTitle>Delete user</DialogTitle>
          <DialogDescription>
            This permanently removes the user from the User Service. This action
            cannot be undone.
          </DialogDescription>
        </DialogHeader>

        {user ? (
          <div className="rounded-md border border-border bg-muted/30 px-4 py-3 text-sm">
            <p className="font-medium text-foreground">{user.full_name}</p>
            <p className="mt-1 text-muted-foreground">{user.email}</p>
            <p className="mt-1 font-mono text-xs text-muted-foreground">
              ID {user.id}
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
            disabled={deleting || !user}
          >
            {deleting ? "Deleting…" : "Delete user"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
