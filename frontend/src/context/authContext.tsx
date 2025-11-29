import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type FrontendRole = 'Unregistered' | 'Producer' | 'Transporter' | 'Retailer' | 'Regulator' | 'Viewer';

export interface AuthUser {
  uid: string;
  email?: string | null;
  role: FrontendRole;
}

type AuthStatus = 'idle' | 'loading';

interface AuthContextValue {
  user: AuthUser | null;
  status: AuthStatus;
  error?: string | null;
  effectiveRole: FrontendRole;
  login: (params: { email: string }) => Promise<void>;
  logout: () => Promise<void>;
  updateRole: (role: FrontendRole) => Promise<void>;
}

const LOCAL_USER_KEY = 'traceability:user';

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const persistLocalUser = (user: AuthUser | null) => {
  if (!user) {
    localStorage.removeItem(LOCAL_USER_KEY);
    return;
  }
  localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(user));
};

const readLocalUser = (): AuthUser | null => {
  try {
    const raw = localStorage.getItem(LOCAL_USER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AuthUser;
    if (!parsed.role) return null;
    return parsed;
  } catch (err) {
    console.warn('Unable to read local user', err);
    return null;
  }
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const stored = readLocalUser();
    if (stored) {
      setUser(stored);
      setStatus('idle');
    }
  }, []);

  const login = useCallback(async ({ email }: { email: string }) => {
    setStatus('loading');
    setError(null);
    try {
      const nextUser: AuthUser = {
        uid: `local-${Date.now()}`,
        email,
        role: 'Viewer',
      };
      setUser(nextUser);
      persistLocalUser(nextUser);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      throw err;
    } finally {
      setStatus('idle');
    }
  }, []);

  const logout = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      setUser(null);
      persistLocalUser(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
    } finally {
      setStatus('idle');
    }
  }, []);

  const updateRole = useCallback(async (_role: FrontendRole) => {
    // UI role is derived from on-chain role; no-op placeholder to satisfy consumers
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    status,
    error,
    effectiveRole: user?.role ?? 'Viewer',
    login,
    logout,
    updateRole,
  }), [user, status, error, login, logout, updateRole]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
};
