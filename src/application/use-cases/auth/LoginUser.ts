import type { AuthRepository, AuthSession } from "@/domain/repositories";
import { InvalidAuthInputError } from "@/application/errors";
import { validateLoginCredentials } from "@/domain/value-objects/authValidation";

export function loginUser(
  repo: AuthRepository,
  input: { email: unknown; password: unknown }
): Promise<AuthSession> {
  const result = validateLoginCredentials(input);
  if (result.error) throw new InvalidAuthInputError(result.error);
  return repo.login(result.value!.email, result.value!.password);
}
