import axios, { type InternalAxiosRequestConfig } from "axios";

let currentAccessToken: string | null = null;
let onAuthFailure: (() => void) | null = null;
let refreshPromise: Promise<string | null> | null = null;

export function setAccessToken(token: string | null): void {
  currentAccessToken = token;
}

export function setAuthFailureHandler(handler: (() => void) | null): void {
  onAuthFailure = handler;
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
    const originalRequest = error.config;

    // Never try to "refresh the refresh call" — infinite-loop guard, and
    // avoids redirecting anonymous first-time visitors to /login just
    // because AuthContext's silent mount-time refresh() got a 401.
    if (!originalRequest || originalRequest.url === "/auth/refresh") {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      if (!refreshPromise) {
        refreshPromise = axiosClient
          .post("/auth/refresh")
          .then((res) => {
            currentAccessToken = res.data.accessToken;
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
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return axiosClient(originalRequest);
      }
    }

    // Any other error: propagate for the calling page to show inline.
    // TODO(toast): replace with a real toast system in Fase 4.
    return Promise.reject(error);
  }
);
