import axios, { type InternalAxiosRequestConfig } from "axios";
import type { User } from "@/domain/entities";
import { shouldAttemptSessionRefresh } from "./authRetryPolicy";

export interface ClientAuthSession {
  accessToken: string;
  expiresAt: number;
  user: User;
}

interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

let currentAccessToken: string | null = null;
let onAuthFailure: (() => void) | null = null;
let onSessionRefreshed: ((session: ClientAuthSession) => void) | null = null;
let refreshPromise: Promise<string | null> | null = null;

export function setAccessToken(token: string | null): void {
  currentAccessToken = token;
}

export function configureAuthHandlers(handlers: {
  onFailure: (() => void) | null;
  onRefreshed: ((session: ClientAuthSession) => void) | null;
}): void {
  onAuthFailure = handlers.onFailure;
  onSessionRefreshed = handlers.onRefreshed;
}

export const axiosClient = axios.create({
  baseURL: "/api",
  withCredentials: true,
});

axiosClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (currentAccessToken) {
    config.headers.set("Authorization", `Bearer ${currentAccessToken}`);
  }
  return config;
});

axiosClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as RetryableRequestConfig | undefined;

    // Never try to "refresh the refresh call" — infinite-loop guard, and
    // avoids redirecting anonymous first-time visitors to /login just
    // because AuthContext's silent mount-time refresh() got a 401.
    if (!originalRequest) {
      return Promise.reject(error);
    }

    if (
      shouldAttemptSessionRefresh({
        url: originalRequest.url,
        status: error.response?.status,
        alreadyRetried: originalRequest._retry,
      })
    ) {
      originalRequest._retry = true;

      if (!refreshPromise) {
        // Use a bare axios call so refresh itself never passes through this
        // interceptor and can neither recurse nor trigger global auth failure.
        refreshPromise = axios
          .post<ClientAuthSession>("/api/auth/refresh", undefined, { withCredentials: true })
          .then((res) => {
            currentAccessToken = res.data.accessToken;
            onSessionRefreshed?.(res.data);
            return currentAccessToken;
          })
          .catch(() => {
            currentAccessToken = null;
            onAuthFailure?.();
            return null;
          })
          .finally(() => {
            refreshPromise = null;
          });
      }

      const newToken = await refreshPromise;
      if (newToken) {
        originalRequest.headers.set("Authorization", `Bearer ${newToken}`);
        return axiosClient(originalRequest);
      }
    }

    // Any other error: propagate for the calling page to show inline.
    // TODO(toast): replace with a real toast system in Fase 4.
    return Promise.reject(error);
  }
);
