import { ApiResponse } from "@openconnect/shared/types";
import { useState, useEffect, useCallback, useMemo } from "react";

// TODO: change to refresh token approach
// Hook: useAuthHeaders
// Provides a safe-ish client-side token manager and convenience headers builder.
// Notes:
// - localStorage is used for persistence but is vulnerable to XSS. Change to refresh token approach in prod.
// - This hook keeps an in-memory copy for fast access and syncs across tabs via the "storage" event.
export function useAuthHeaders() {
  const isBrowser = typeof window !== "undefined" && !!window.localStorage;

  const readToken = useCallback((): string | null => {
    if (!isBrowser) return null;
    try {
      return window.localStorage.getItem("token");
    } catch (err) {
      // localStorage access can throw in some environments (e.g., blocked third-party storage)
      return null;
    }
  }, [isBrowser]);

  const [token, setTokenState] = useState<string | null>(() => readToken());

  // update token both in-memory and in localStorage
  const setToken = useCallback(
    (newToken: string | null) => {
      setTokenState(newToken);
      if (!isBrowser) return;
      try {
        const ls = (globalThis as any).localStorage;
        if (newToken === null) {
          ls.removeItem("token");
        } else {
          ls.setItem("token", newToken);
        }
        // Also write a hint to trigger storage listeners reliably
        ls.setItem("token_updated_at", String(Date.now()));
      } catch (err) {
        // ignore storage errors
      }
    },
    [isBrowser],
  );

  const clearToken = useCallback(() => setToken(null), [setToken]);

  // Sync across tabs/windows
  useEffect(() => {
    if (!isBrowser) return;

    const onStorage = (e: any) => {
      console.log("Storage event:", e.key);
      if (e.key === "token" || e.key === "token_updated_at") {
        setTokenState(readToken());
      }
    };

    window.addEventListener?.("storage", onStorage);
    return () => window.removeEventListener?.("storage", onStorage);
  }, [isBrowser, readToken]);

  // Re-read token on mount in case storage changed before hook ran
  useEffect(() => {
    setTokenState(readToken());
  }, [readToken]);

  const headers = useMemo(() => {
    const base: Record<string, string> = { "Content-Type": "application/json" };
    if (token) base.Authorization = `Bearer ${token}`;
    return base;
  }, [token]);

  return { token, headers, setToken, clearToken } as const;
}

export const useFetchData = <T>(
  url: string,
  headers?: Record<string, string>,
  abortController = new AbortController(),
) => {
  const { headers: authHeaders } = useAuthHeaders();
  const [data, setData] = useState<T | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(url, {
          headers: { ...authHeaders, ...headers },
          signal: abortController.signal,
        });
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const result = (await response.json()) as ApiResponse<T>;
        if (!result.success) {
          throw new Error(result.error?.message || "API returned an error");
        }
        setData(result.data);
        setError(null);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "An unknown error occurred",
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();

    // Cleanup function to abort the fetch request on unmount
    return () => abortController.abort();
  }, [url, headers, authHeaders]); // Re-run effect if URL or headers change

  return { data, isLoading, error };
};
