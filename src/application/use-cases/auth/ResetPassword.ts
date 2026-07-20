import type { AuthRepository, AuthSession } from "@/domain/repositories";
import { InvalidAuthInputError } from "@/application/errors";
import { validatePasswordReset } from "@/domain/value-objects/authValidation";

export function resetPassword(
  repo: AuthRepository,
  input: { tokenHash: unknown; newPassword: unknown }
): Promise<AuthSession> {
  const result = validatePasswordReset(input);
  if (result.error) throw new InvalidAuthInputError(result.error);
  return repo.resetPassword(result.value!.tokenHash, result.value!.newPassword);
}
