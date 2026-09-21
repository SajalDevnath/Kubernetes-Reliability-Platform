import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api/client";
import type { User } from "@/lib/api/types";
import * as usersApi from "@/lib/api/users";
import { UsersPage } from "@/pages/users";

vi.mock("@/lib/api/users", () => ({
  listUsers: vi.fn(),
  createUser: vi.fn(),
  updateUser: vi.fn(),
  deleteUser: vi.fn(),
  getUser: vi.fn(),
  getUserServiceHealth: vi.fn(),
}));

const mockUser: User = {
  id: 1,
  email: "alice@example.com",
  full_name: "Alice Example",
  is_active: true,
  created_at: "2025-01-01T12:00:00.000Z",
  updated_at: "2025-01-01T12:00:00.000Z",
};

function renderUsersPage() {
  return render(
    <MemoryRouter>
      <UsersPage />
    </MemoryRouter>,
  );
}

describe("UsersPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows a loading state while users are being fetched", async () => {
    vi.mocked(usersApi.listUsers).mockImplementation(
      () =>
        new Promise(() => {
          // Intentionally unresolved to keep loading state visible.
        }),
    );

    renderUsersPage();

    expect(screen.getByText("Loading users…")).toBeInTheDocument();
    expect(screen.queryByText("Alice Example")).not.toBeInTheDocument();
  });

  it("renders users returned by the API", async () => {
    vi.mocked(usersApi.listUsers).mockResolvedValue([mockUser]);

    renderUsersPage();

    await waitFor(() => {
      expect(screen.getByText("Alice Example")).toBeInTheDocument();
    });

    expect(screen.getByText("alice@example.com")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("shows an empty state when no users exist", async () => {
    vi.mocked(usersApi.listUsers).mockResolvedValue([]);

    renderUsersPage();

    await waitFor(() => {
      expect(screen.getByText("No users yet")).toBeInTheDocument();
    });

    expect(screen.getAllByRole("button", { name: "Create user" }).length).toBeGreaterThan(0);
  });

  it("shows an error state when the API request fails", async () => {
    vi.mocked(usersApi.listUsers).mockRejectedValue(
      new ApiError("Service unavailable", 503),
    );

    renderUsersPage();

    await waitFor(() => {
      expect(screen.getByText("Unable to load users")).toBeInTheDocument();
    });

    expect(screen.getByText("Service unavailable")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });

  it("creates a user and refreshes the list", async () => {
    const user = userEvent.setup();
    const createdUser: User = {
      ...mockUser,
      id: 2,
      email: "bob@example.com",
      full_name: "Bob Example",
    };

    vi.mocked(usersApi.listUsers)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([createdUser]);
    vi.mocked(usersApi.createUser).mockResolvedValue(createdUser);

    renderUsersPage();

    await waitFor(() => {
      expect(screen.getByText("No users yet")).toBeInTheDocument();
    });

    await waitFor(() => {
      const createButtons = screen.getAllByRole("button", { name: "Create user" });
      expect(createButtons.some((button) => !button.hasAttribute("disabled"))).toBe(true);
    });

    const createButtons = screen.getAllByRole("button", { name: "Create user" });
    const enabledCreateButton =
      createButtons.find((button) => !button.hasAttribute("disabled")) ??
      createButtons[createButtons.length - 1];
    await user.click(enabledCreateButton);

    const dialog = await screen.findByRole("dialog");
    await user.type(within(dialog).getByLabelText("Full name"), "Bob Example");
    await user.type(within(dialog).getByLabelText("Email"), "bob@example.com");
    await user.click(
      within(dialog).getByRole("button", { name: "Create user" }),
    );

    await waitFor(() => {
      expect(usersApi.createUser).toHaveBeenCalledWith({
        full_name: "Bob Example",
        email: "bob@example.com",
      });
    });

    await waitFor(() => {
      expect(screen.getByText("Bob Example")).toBeInTheDocument();
    });
  });

  it("requires confirmation before deleting a user", async () => {
    const user = userEvent.setup();

    vi.mocked(usersApi.listUsers).mockResolvedValue([mockUser]);

    renderUsersPage();

    await waitFor(() => {
      expect(screen.getByText("Alice Example")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Delete Alice Example" }));

    const dialog = screen.getByRole("dialog");
    expect(
      within(dialog).getByRole("heading", { name: "Delete user" }),
    ).toBeInTheDocument();
    expect(within(dialog).getByText("alice@example.com")).toBeInTheDocument();
    expect(usersApi.deleteUser).not.toHaveBeenCalled();

    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    expect(usersApi.deleteUser).not.toHaveBeenCalled();
  });
});
