import type { AuthRepository, AuthSession } from "@/domain/repositories";

export function resetPassword(
  repo: AuthRepository,
  input: { tokenHash: string; newPassword: string }
): Promise<AuthSession> {
  return repo.resetPassword(input.tokenHash, input.newPassword);
}
