import { startAuthentication, startRegistration } from '@simplewebauthn/browser';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { ApiError, api, type SessionUser } from './api';

interface AuthState {
  user: SessionUser | null;
  loading: boolean;
  register: (handle: string, displayName: string) => Promise<SessionUser>;
  login: (handle: string) => Promise<SessionUser>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function passkeySupported(): boolean {
  return typeof window !== 'undefined' && typeof window.PublicKeyCredential !== 'undefined';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    api
      .me()
      .then((res) => {
        if (active) setUser(res.authenticated && res.user ? res.user : null);
      })
      .catch(() => active && setUser(null))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const register = useCallback(async (handle: string, displayName: string) => {
    const options = await api.registerOptions(handle, displayName);
    let attestation;
    try {
      attestation = await startRegistration({ optionsJSON: options as never });
    } catch (err) {
      throw new ApiError(0, 'cancelled', toPasskeyMessage(err));
    }
    const created = await api.registerVerify(attestation);
    setUser(created);
    return created;
  }, []);

  const login = useCallback(async (handle: string) => {
    const options = await api.loginOptions(handle);
    let assertion;
    try {
      assertion = await startAuthentication({ optionsJSON: options as never });
    } catch (err) {
      throw new ApiError(0, 'cancelled', toPasskeyMessage(err));
    }
    const session = await api.loginVerify(assertion);
    setUser(session);
    return session;
  }, []);

  const logout = useCallback(async () => {
    await api.logout();
    setUser(null);
  }, []);

  const value = useMemo<AuthState>(
    () => ({ user, loading, register, login, logout }),
    [user, loading, register, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

function toPasskeyMessage(err: unknown): string {
  if (err instanceof Error) {
    if (err.name === 'NotAllowedError') return 'Passkey prompt was dismissed or timed out.';
    if (err.name === 'InvalidStateError') return 'This device already has a passkey for this account.';
    return err.message;
  }
  return 'Passkey operation failed.';
}
