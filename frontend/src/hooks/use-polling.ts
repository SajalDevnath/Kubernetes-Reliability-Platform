import { useCallback, useEffect, useRef, useState } from "react";

import { ApiError } from "@/lib/api/client";

export type PollingStatus = "loading" | "success" | "error";

export interface PollingResult<T> {
  data: T | null;
  error: string | null;
  status: PollingStatus;
  refresh: () => Promise<void>;
}

export function usePolling<T>(
  fetcher: () => Promise<T>,
  intervalMs: number,
  enabled = true,
  deps: unknown[] = [],
): PollingResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<PollingStatus>("loading");
  const hasLoadedRef = useRef(false);
  const fetcherRef = useRef(fetcher);

  fetcherRef.current = fetcher;

  const refresh = useCallback(async () => {
    if (!enabled) {
      return;
    }

    if (!hasLoadedRef.current) {
      setStatus("loading");
    }

    try {
      const result = await fetcherRef.current();
      setData(result);
      setError(null);
      setStatus("success");
      hasLoadedRef.current = true;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Request failed");
      setStatus("error");
      hasLoadedRef.current = true;
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      setStatus("loading");
      setData(null);
      setError(null);
      hasLoadedRef.current = false;
      return;
    }

    hasLoadedRef.current = false;
    void refresh();

    const intervalId = window.setInterval(() => {
      void refresh();
    }, intervalMs);

    return () => {
      window.clearInterval(intervalId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps are explicit restart triggers.
  }, [enabled, intervalMs, refresh, ...deps]);

  return { data, error, status, refresh };
}
