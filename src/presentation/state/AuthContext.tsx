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
import { setAccessToken, setAuthFailureHandler } from "@/presentation/services/axiosClient";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

interface AuthContextValue {
  user: User | null;
  accessToken: string | null;
  status: AuthStatus;
  setSession: (session: { user: User; accessToken: string }) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessTokenState] = useState<string | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");
  const bootstrapped = useRef(false);

  const setSession = useCallback((session: { user: User; accessToken: string }) => {
    setUser(session.user);
    setAccessTokenState(session.accessToken);
    setStatus("authenticated");
  }, []);

  const clearSession = useCallback(() => {
    setUser(null);
    setAccessTokenState(null);
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
    setAccessToken(accessToken);
  }, [accessToken]);

  useEffect(() => {
    setAuthFailureHandler(() => {
      clearSession();
      router.push("/login");
    });
    return () => setAuthFailureHandler(null);
  }, [clearSession, router]);

  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;
    // Silently resume a session from the httpOnly refresh cookie on load.
    authService
      .refresh()
      .then((result) => setSession({ user: result.user, accessToken: result.accessToken }))
      .catch(() => clearSession());
  }, [clearSession, setSession]);

  return (
    <AuthContext.Provider value={{ user, accessToken, status, setSession, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
