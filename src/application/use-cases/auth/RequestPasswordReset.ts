import type { AuthRepository } from "@/domain/repositories";

export async function requestPasswordReset(
  repo: AuthRepository,
  input: { email: string; redirectTo: string }
): Promise<void> {
  // Always resolves — never reveal whether the email exists in the system.
  await repo.requestPasswordReset(input.email, input.redirectTo);
}
