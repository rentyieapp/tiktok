import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { MeDTO, UserDTO } from '@shared/types';
import { api, ApiError } from './api';

interface AuthContextValue {
  me: MeDTO | null;
  loading: boolean;
  refresh: () => Promise<MeDTO | null>;
  login: (email: string, password: string) => Promise<UserDTO>;
  register: (email: string, password: string, displayName: string) => Promise<UserDTO>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<MeDTO | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async (): Promise<MeDTO | null> => {
    try {
      const result = await api.get<MeDTO>('/api/auth/me');
      setMe(result);
      return result;
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setMe(null);
        return null;
      }
      setMe(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = useCallback(
    async (email: string, password: string) => {
      const result = await api.post<{ user: UserDTO }>('/api/auth/login', { email, password });
      await refresh();
      return result.user;
    },
    [refresh],
  );

  const register = useCallback(
    async (email: string, password: string, displayName: string) => {
      const result = await api.post<{ user: UserDTO }>('/api/auth/register', {
        email,
        password,
        displayName,
      });
      await refresh();
      return result.user;
    },
    [refresh],
  );

  const logout = useCallback(async () => {
    try {
      await api.post('/api/auth/logout');
    } finally {
      setMe(null);
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ me, loading, refresh, login, register, logout }),
    [me, loading, refresh, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth AuthProvider içinde kullanılmalıdır.');
  return context;
}
