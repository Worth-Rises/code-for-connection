import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
const AuthContext = createContext(null);
const API_BASE = '/api';
export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        const storedToken = localStorage.getItem('token');
        if (storedToken) {
            setToken(storedToken);
            fetch(`${API_BASE}/auth/me`, {
                headers: { Authorization: `Bearer ${storedToken}` },
            })
                .then((res) => res.json())
                .then((data) => {
                if (data.success)
                    setUser(data.data);
                else
                    localStorage.removeItem('token');
            })
                .catch(() => localStorage.removeItem('token'))
                .finally(() => setLoading(false));
        }
        else {
            setLoading(false);
        }
    }, []);
    const pinLogin = useCallback(async (pin, facilityId) => {
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
    }, []);
    const logout = useCallback(() => {
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
    }, []);
    return (<AuthContext.Provider value={{ user, token, loading, pinLogin, logout }}>
      {children}
    </AuthContext.Provider>);
}
export function useAuth() {
    const context = useContext(AuthContext);
    if (!context)
        throw new Error('useAuth must be used within an AuthProvider');
    return context;
}
//# sourceMappingURL=AuthContext.js.map