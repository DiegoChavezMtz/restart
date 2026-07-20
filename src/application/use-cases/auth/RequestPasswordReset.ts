import type { AuthRepository } from "@/domain/repositories";
import { InvalidAuthInputError } from "@/application/errors";
import { normalizeEmail } from "@/domain/value-objects/authValidation";

export async function requestPasswordReset(
  repo: AuthRepository,
  input: { email: unknown; redirectTo: string }
): Promise<void> {
  const email = normalizeEmail(input.email);
  if (email.error) throw new InvalidAuthInputError(email.error);
  // Always resolves — never reveal whether the email exists in the system.
  await repo.requestPasswordReset(email.value!, input.redirectTo);
}
