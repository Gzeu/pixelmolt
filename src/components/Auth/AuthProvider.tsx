'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface Agent {
  id: string;
  name: string;
  apiKey: string;
  tier: 'anonymous' | 'registered' | 'verified';
  karma: number;
  pixelsPlaced: number;
  moltbookUsername?: string;
}

interface AuthContextType {
  agent: Agent | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (apiKey: string) => Promise<boolean>;
  logout: () => void;
  register: (name: string, moltbookUsername?: string) => Promise<{ success: boolean; agent?: Agent; error?: string }>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [agent, setAgent] = useState<Agent | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const savedKey = localStorage.getItem('pixelmolt_api_key');
    if (savedKey) {
      validateAndSetAgent(savedKey).finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const validateAndSetAgent = async (apiKey: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/auth', { headers: { 'X-API-Key': apiKey } });
      const data = await res.json();
      if (data.success && data.agent) {
        setAgent({ ...data.agent, apiKey });
        localStorage.setItem('pixelmolt_api_key', apiKey);
        return true;
      }
    } catch (e) {
      console.error('[Auth] Validation error:', e);
    }
    return false;
  };

  const login = async (apiKey: string): Promise<boolean> => {
    setIsLoading(true);
    const success = await validateAndSetAgent(apiKey);
    setIsLoading(false);
    return success;
  };

  const logout = () => {
    setAgent(null);
    localStorage.removeItem('pixelmolt_api_key');
  };

  const register = async (name: string, moltbookUsername?: string) => {
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, moltbookUsername })
      });
      const data = await res.json();
      if (data.success && data.agent) {
        const newAgent: Agent = { ...data.agent, karma: 0, pixelsPlaced: 0, moltbookUsername };
        setAgent(newAgent);
        localStorage.setItem('pixelmolt_api_key', data.agent.apiKey);
        return { success: true, agent: newAgent };
      }
      return { success: false, error: data.error || 'Registration failed' };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  };

  return (
    <AuthContext.Provider value={{ agent, isLoading, isAuthenticated: !!agent, login, logout, register }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
