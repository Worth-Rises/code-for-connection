import { useCallback } from 'react';
import { useAuth } from '../../../../apps/web/src/context/AuthContext';

const BASE_PATH = '/api/admin';

export function useAdminApi() {
  const { token } = useAuth();

  const request = useCallback(
    async (method: string, path: string, body?: unknown) => {
      const headers: Record<string, string> = {
        Authorization: `Bearer ${token}`,
      };
      if (body !== undefined) {
        headers['Content-Type'] = 'application/json';
      }
      const response = await fetch(`${BASE_PATH}${path}`, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error?.message || `Request failed: ${response.status}`);
      }
      return data;
    },
    [token]
  );

  const get = useCallback((path: string) => request('GET', path), [request]);
  const post = useCallback((path: string, body: unknown) => request('POST', path, body), [request]);
  const patch = useCallback((path: string, body: unknown) => request('PATCH', path, body), [request]);
  const del = useCallback((path: string) => request('DELETE', path), [request]);

  return { get, post, patch, del };
}
