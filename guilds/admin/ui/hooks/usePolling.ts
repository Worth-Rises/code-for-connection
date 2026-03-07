import { useState, useEffect, useRef, useCallback } from 'react';

export function usePolling<T>(
  fetchFn: () => Promise<T>,
  intervalMs: number,
  deps: unknown[] = []
): {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refresh: () => void;
} {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const fetchFnRef = useRef(fetchFn);
  const isFirstFetch = useRef(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Keep fetchFn ref current to avoid stale closures
  useEffect(() => {
    fetchFnRef.current = fetchFn;
  }, [fetchFn]);

  const doFetch = useCallback(async () => {
    if (isFirstFetch.current) {
      setLoading(true);
    }
    try {
      const result = await fetchFnRef.current();
      setData(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      if (isFirstFetch.current) {
        isFirstFetch.current = false;
        setLoading(false);
      }
    }
  }, []);

  const refresh = useCallback(() => {
    doFetch();
  }, [doFetch]);

  useEffect(() => {
    isFirstFetch.current = true;
    doFetch();

    intervalRef.current = setInterval(doFetch, intervalMs);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intervalMs, ...deps]);

  return { data, loading, error, refresh };
}
