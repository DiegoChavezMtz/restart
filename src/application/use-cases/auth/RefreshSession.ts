import type { AuthRepository, AuthSession } from "@/domain/repositories";

export function refreshSession(
  repo: AuthRepository,
  refreshToken: string
): Promise<AuthSession> {
  return repo.refreshSession(refreshToken);
}
