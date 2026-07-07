import type { AuthRepository } from "@/domain/repositories";

export function logoutUser(
  repo: AuthRepository,
  input: { accessToken: string; refreshToken: string | null }
): Promise<void> {
  // A missing/expired refresh cookie is not an error — treat as already logged out.
  return repo.logout(input.accessToken, input.refreshToken);
}
