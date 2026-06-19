import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import {
  clearUser,
  getStoredUser,
  login as loginUser,
  signup as signupUser,
  updateProfile,
  type ConsumerUser,
} from '@/lib/consumer-auth';

interface AuthContextValue {
  user: ConsumerUser | null;
  loading: boolean;
  login: (input: { email: string; password: string }) => Promise<ConsumerUser>;
  signup: (input: { email: string; password: string; name?: string }) => Promise<ConsumerUser>;
  logout: () => Promise<void>;
  refreshProfile: (
    patch: Parameters<typeof updateProfile>[1],
  ) => Promise<ConsumerUser | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<ConsumerUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void getStoredUser().then((stored) => {
      setUser(stored);
      setLoading(false);
    });
  }, []);

  const login = useCallback(async (input: { email: string; password: string }) => {
    const next = await loginUser(input);
    setUser(next);
    return next;
  }, []);

  const signup = useCallback(
    async (input: { email: string; password: string; name?: string }) => {
      const next = await signupUser(input);
      setUser(next);
      return next;
    },
    [],
  );

  const logout = useCallback(async () => {
    await clearUser();
    setUser(null);
  }, []);

  const refreshProfile = useCallback(
    async (patch: Parameters<typeof updateProfile>[1]) => {
      if (!user) return null;
      const next = await updateProfile(user.id, patch);
      setUser(next);
      return next;
    },
    [user],
  );

  const value = useMemo(
    () => ({ user, loading, login, signup, logout, refreshProfile }),
    [user, loading, login, signup, logout, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
