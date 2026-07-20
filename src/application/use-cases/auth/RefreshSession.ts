import type { AuthRepository, AuthSession } from "@/domain/repositories";
import { UnauthenticatedError } from "@/application/errors";

export function refreshSession(
  repo: AuthRepository,
  refreshToken: string
): Promise<AuthSession> {
  if (!refreshToken.trim()) throw new UnauthenticatedError();
  return repo.refreshSession(refreshToken);
}
