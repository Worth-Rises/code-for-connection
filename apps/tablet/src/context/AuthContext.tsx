import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface User {
  id: string;
  role: 'incarcerated';
  firstName: string;
  lastName: string;
  facilityId?: string;
  housingUnitId?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  /** True when incarcerated person has not yet recorded their name audio (first login) */
  needsNameRecording: boolean;
  /** Call after successfully recording name audio */
  clearNeedsNameRecording: () => void;
  pinLogin: (pin: string, facilityId: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const API_BASE = '/api';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsNameRecording, setNeedsNameRecording] = useState(false);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      setToken(storedToken);
      fetch(`${API_BASE}/auth/me`, {
        headers: { Authorization: `Bearer ${storedToken}` },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setUser(data.data);
            // /auth/me does not return needsNameRecording; check status endpoint for incarcerated users
            if (data.data?.role === 'incarcerated') {
              fetch(`${API_BASE}/voice/users/name-audio/status`, {
                headers: { Authorization: `Bearer ${storedToken}` },
              })
                .then((r) => r.json())
                .then((d) => {
                  if (d.success && !d.data?.hasNameAudio) setNeedsNameRecording(true);
                })
                .catch((err) => console.error('[AuthContext] Failed to check name-audio status:', err));
            }
          } else localStorage.removeItem('token');
        })
        .catch((err) => { console.error('[AuthContext] Failed to fetch /auth/me:', err); localStorage.removeItem('token'); })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const pinLogin = useCallback(async (pin: string, facilityId: string) => {
    const response = await fetch(`${API_BASE}/auth/pin-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin, facilityId }),
    });
    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.error?.message || 'Login failed');
    }
    localStorage.setItem('token', data.data.token);
    setToken(data.data.token);
    setUser(data.data.user);
    setNeedsNameRecording(Boolean(data.data.needsNameRecording));
  }, []);

  const clearNeedsNameRecording = useCallback(() => setNeedsNameRecording(false), []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setNeedsNameRecording(false);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, needsNameRecording, clearNeedsNameRecording, pinLogin, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
