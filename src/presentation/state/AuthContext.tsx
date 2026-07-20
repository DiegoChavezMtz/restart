"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import type { User } from "@/domain/entities";
import * as authService from "@/presentation/services/authService";
import {
  configureAuthHandlers,
  setAccessToken,
  type ClientAuthSession,
} from "@/presentation/services/axiosClient";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

interface AuthContextValue {
  user: User | null;
  accessToken: string | null;
  expiresAt: number | null;
  status: AuthStatus;
  setSession: (session: ClientAuthSession) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessTokenState] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");
  const bootstrapped = useRef(false);

  const setSession = useCallback((session: ClientAuthSession) => {
    // Keep the HTTP client in sync before React renders or a navigation starts.
    setAccessToken(session.accessToken);
    setUser(session.user);
    setAccessTokenState(session.accessToken);
    setExpiresAt(session.expiresAt);
    setStatus("authenticated");
  }, []);

  const clearSession = useCallback(() => {
    setAccessToken(null);
    setUser(null);
    setAccessTokenState(null);
    setExpiresAt(null);
    setStatus("unauthenticated");
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } finally {
      clearSession();
    }
  }, [clearSession]);

  useEffect(() => {
    configureAuthHandlers({
      onFailure: () => {
        clearSession();
        const nextPath = `${window.location.pathname}${window.location.search}`;
        router.replace(`/login?next=${encodeURIComponent(nextPath)}`);
      },
      onRefreshed: setSession,
    });
    return () => configureAuthHandlers({ onFailure: null, onRefreshed: null });
  }, [clearSession, router, setSession]);

  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;
    // Silently resume a session from the httpOnly refresh cookie on load.
    authService
      .refresh()
      .then(setSession)
      .catch(() => clearSession());
  }, [clearSession, setSession]);

  return (
    <AuthContext.Provider value={{ user, accessToken, expiresAt, status, setSession, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
