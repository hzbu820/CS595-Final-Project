import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type UserCredential,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getFirebaseAuth, getFirebaseDb, isFirebaseReady } from '../lib/firebase';

export type FrontendRole = 'Unregistered' | 'Producer' | 'Transporter' | 'Retailer' | 'Regulator' | 'Viewer';

export interface AuthUser {
  uid: string;
  email?: string | null;
  role: FrontendRole;
  displayName?: string | null;
}

type AuthStatus = 'idle' | 'loading';

interface AuthContextValue {
  user: AuthUser | null;
  status: AuthStatus;
  error?: string | null;
  effectiveRole: FrontendRole;
  login: (params: { email: string; password: string; role: FrontendRole }) => Promise<void>;
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

const readRoleFromFirestore = async (uid: string, email?: string | null): Promise<AuthUser> => {
  const db = getFirebaseDb();
  if (!db) {
    return { uid, email, role: 'Viewer' };
  }
  const ref = doc(db, 'users', uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    return { uid, email, role: 'Viewer' };
  }
  const data = snap.data() as { role?: FrontendRole; displayName?: string | null };
  return { uid, email, displayName: data.displayName, role: data.role ?? 'Viewer' };
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const auth = getFirebaseAuth();
    if (auth) {
      const unsubscribe = onAuthStateChanged(auth, async (next) => {
        if (!next) {
          setUser(null);
          persistLocalUser(null);
          return;
        }
        const resolved = await readRoleFromFirestore(next.uid, next.email);
        setUser(resolved);
        persistLocalUser(resolved);
      });
      return () => unsubscribe();
    }

    const stored = readLocalUser();
    if (stored) {
      setUser(stored);
    }
  }, []);

  const loginWithCred = useCallback(async (cred: UserCredential, role: FrontendRole) => {
    const db = getFirebaseDb();
    if (db) {
      await setDoc(
        doc(db, 'users', cred.user.uid),
        {
          email: cred.user.email,
          role,
          updatedAt: Date.now(),
        },
        { merge: true },
      );
    }
    const nextUser: AuthUser = {
      uid: cred.user.uid,
      email: cred.user.email,
      displayName: cred.user.displayName,
      role,
    };
    setUser(nextUser);
    persistLocalUser(nextUser);
  }, []);

  const login = useCallback(
    async ({ email, password, role }: { email: string; password: string; role: FrontendRole }) => {
      setStatus('loading');
      setError(null);
      try {
        if (isFirebaseReady()) {
          const auth = getFirebaseAuth();
          if (!auth) throw new Error('Firebase not initialized');

          let cred: UserCredential;
          try {
            cred = await signInWithEmailAndPassword(auth, email, password);
          } catch {
            cred = await createUserWithEmailAndPassword(auth, email, password);
          }
          await loginWithCred(cred, role);
        } else {
          const fallback: AuthUser = {
            uid: `local-${Date.now()}`,
            email,
            role,
          };
          setUser(fallback);
          persistLocalUser(fallback);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        throw err;
      } finally {
        setStatus('idle');
      }
    },
    [loginWithCred],
  );

  const logout = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      const auth = getFirebaseAuth();
      if (auth) {
        await signOut(auth);
      }
      setUser(null);
      persistLocalUser(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
    } finally {
      setStatus('idle');
    }
  }, []);

  const updateRole = useCallback(async (role: FrontendRole) => {
    if (!user) return;
    const db = getFirebaseDb();
    if (db) {
      await setDoc(
        doc(db, 'users', user.uid),
        {
          role,
          updatedAt: Date.now(),
        },
        { merge: true },
      );
    }
    const next = { ...user, role };
    setUser(next);
    persistLocalUser(next);
  }, [user]);

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
