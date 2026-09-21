import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { usePolling } from "@/hooks/use-polling";

describe("usePolling", () => {
  it("loads data on mount", async () => {
    const fetcher = vi.fn().mockResolvedValue({ value: 1 });
    const { result } = renderHook(() => usePolling(fetcher, 60_000));

    await waitFor(() => {
      expect(result.current.status).toBe("success");
    });

    expect(result.current.data).toEqual({ value: 1 });
    expect(fetcher).toHaveBeenCalled();
  });

  it("does not poll when disabled", async () => {
    const fetcher = vi.fn().mockResolvedValue({ value: 1 });
    const { result } = renderHook(() => usePolling(fetcher, 1000, false));

    await waitFor(() => {
      expect(result.current.status).toBe("loading");
    });
    expect(fetcher).not.toHaveBeenCalled();
  });
});
