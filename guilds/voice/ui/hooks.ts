import { ApiResponse } from "@openconnect/shared/types";
import { useState, useEffect, useCallback, useMemo } from "react";


// TODO: swap localStorage implementation with AuthContext from apps
export function useAuthHeader() {
  const [token, setToken] = useState<string | null>(window.localStorage.getItem("token"));

  // Sync across tabs/windows
  useEffect(() => {
    const onStorage = ({key}: StorageEvent) => {
      if (key === "token") {
        setToken(window.localStorage.getItem("token"));
      }
    };

    window.addEventListener?.("storage", onStorage);
    return () => window.removeEventListener?.("storage", onStorage);
  }, []);


   const header = useMemo(() => ({
    "Authorization": `Bearer ${token}`})
  , [token]);

  return { token, authHeader: header };
}

const defaultHeaders = { "Content-Type": "application/json" };

// TODO: use axios for requests across frontend to set up default behaviors?
export const useFetch = <T>(
  url: string,
  requestArgs?: RequestInit
) => {
  const { headers, signal, ...remainingRequestArgs} = requestArgs || {};
  const { authHeader} = useAuthHeader();
  const [data, setData] = useState<T | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toggleRefetch, setToggleRefetch] = useState(false);

  const abortController = new AbortController();
  const fetchData = useCallback(async () => {
      console.log(`Fetching ${url}`);
      try {
        const response = await fetch(url, {
          headers: {
            ...defaultHeaders,
            ...headers,
            ...authHeader,
          },
          signal: signal || abortController.signal,
          ...remainingRequestArgs,
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
    }, [url, authHeader, toggleRefetch]);

    const refetch = useCallback(() => {
      setToggleRefetch((prev) => !prev);
    }, []);

  useEffect(() => {
    fetchData();
    // Cleanup function to abort the fetch request on unmount
    return () => abortController.abort();
  }, []);
  
  return { data, error, isLoading, refetch };
};
