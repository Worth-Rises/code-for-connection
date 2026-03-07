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
            fetchUser(storedToken);
        }
        else {
            setLoading(false);
        }
    }, []);
    const fetchUser = async (authToken) => {
        try {
            const response = await fetch(`${API_BASE}/auth/me`, {
                headers: { Authorization: `Bearer ${authToken}` },
            });
            const data = await response.json();
            if (response.ok && data.success) {
                setUser(data.data);
            }
            else {
                localStorage.removeItem('token');
                setToken(null);
            }
        }
        catch {
            localStorage.removeItem('token');
            setToken(null);
        }
        finally {
            setLoading(false);
        }
    };
    const login = useCallback(async (email, password) => {
        const response = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });
        const data = await response.json();
        if (!response.ok || !data.success) {
            throw new Error(data.error?.message || 'Login failed');
        }
        localStorage.setItem('token', data.data.token);
        setToken(data.data.token);
        setUser(data.data.user);
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
    const register = useCallback(async (registerData) => {
        const response = await fetch(`${API_BASE}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(registerData),
        });
        const data = await response.json();
        if (!response.ok || !data.success) {
            throw new Error(data.error?.message || 'Registration failed');
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
    return (<AuthContext.Provider value={{ user, token, loading, login, pinLogin, register, logout }}>
      {children}
    </AuthContext.Provider>);
}
export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
//# sourceMappingURL=AuthContext.js.map