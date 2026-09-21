import {
  AlertCircle,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  Users as UsersIcon,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { DeleteUserDialog } from "@/components/users/delete-user-dialog";
import { UserFormDialog } from "@/components/users/user-form-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api/client";
import type { User } from "@/lib/api/types";
import { listUsers } from "@/lib/api/users";
import { formatDateTime } from "@/lib/format";

type LoadState = "loading" | "success" | "error";

export function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [deleteUser, setDeleteUser] = useState<User | null>(null);

  const loadUsers = useCallback(async () => {
    setLoadState("loading");
    setErrorMessage(null);

    try {
      const data = await listUsers();
      setUsers(data);
      setLoadState("success");
    } catch (err) {
      setUsers([]);
      setLoadState("error");
      if (err instanceof ApiError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage(
          "Unable to reach the User Service. Ensure the backend is running and the development proxy is configured.",
        );
      }
    }
  }, []);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  function handleSuccess(message: string) {
    setSuccessMessage(message);
    void loadUsers();
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <header className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
            Users
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">
            Inspect and manage users exposed by the User Service. Changes are
            persisted through the live API.
          </p>
        </div>
        <Button
          onClick={() => setCreateOpen(true)}
          className="shrink-0"
          disabled={loadState === "loading"}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Create user
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
          <p className="text-sm text-muted-foreground">Loading users…</p>
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
              Unable to load users
            </h2>
            <p className="max-w-md text-sm text-muted-foreground">
              {errorMessage ??
                "The User Service API is unavailable. Check that the service is running on port 8001."}
            </p>
          </div>
          <Button variant="outline" onClick={() => void loadUsers()}>
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Retry
          </Button>
        </div>
      ) : null}

      {loadState === "success" && users.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-border bg-muted/20 px-6 py-12 text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-md border border-border bg-card">
            <UsersIcon className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
          </div>
          <div className="space-y-2">
            <h2 className="text-sm font-medium text-foreground">No users yet</h2>
            <p className="max-w-md text-sm text-muted-foreground">
              The User Service returned an empty list. Create the first user to
              get started.
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Create user
          </Button>
        </div>
      ) : null}

      {loadState === "success" && users.length > 0 ? (
        <div className="overflow-hidden rounded-lg border border-border">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-3 font-medium text-muted-foreground">ID</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Name</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Email</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3 font-medium text-muted-foreground">Created</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b border-border last:border-b-0 hover:bg-muted/20"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      {user.id}
                    </td>
                    <td className="px-4 py-3 font-medium text-foreground">
                      {user.full_name}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{user.email}</td>
                    <td className="px-4 py-3">
                      <Badge variant={user.is_active ? "success" : "muted"}>
                        {user.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDateTime(user.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditUser(user)}
                          aria-label={`Edit ${user.full_name}`}
                        >
                          <Pencil className="h-4 w-4" aria-hidden="true" />
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleteUser(user)}
                          aria-label={`Delete ${user.full_name}`}
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

      <UserFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSuccess={handleSuccess}
      />

      <UserFormDialog
        open={editUser !== null}
        onOpenChange={(open) => {
          if (!open) {
            setEditUser(null);
          }
        }}
        user={editUser}
        onSuccess={handleSuccess}
      />

      <DeleteUserDialog
        user={deleteUser}
        open={deleteUser !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteUser(null);
          }
        }}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
