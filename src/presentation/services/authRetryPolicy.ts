const NON_REFRESHABLE_AUTH_ENDPOINTS = new Set([
  "/auth/login",
  "/auth/register",
  "/auth/forgot-password",
  "/auth/reset-password",
  "/auth/refresh",
]);

export function shouldAttemptSessionRefresh(input: {
  url?: string;
  status?: number;
  alreadyRetried?: boolean;
}): boolean {
  return Boolean(
    input.url &&
      input.status === 401 &&
      !input.alreadyRetried &&
      !NON_REFRESHABLE_AUTH_ENDPOINTS.has(input.url)
  );
}
