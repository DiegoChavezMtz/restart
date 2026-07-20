import type { AuthRepository, AuthSession } from "@/domain/repositories";
import { InvalidAuthInputError } from "@/application/errors";
import { validateRegistrationDetails } from "@/domain/value-objects/authValidation";
import { validateInvitationToken } from "./ValidateInvitationToken";

export async function registerViaInvitation(
  repo: AuthRepository,
  input: { token: unknown; email: unknown; password: unknown; fullName: unknown }
): Promise<AuthSession> {
  const result = validateRegistrationDetails(input);
  if (result.error) throw new InvalidAuthInputError(result.error);
  const details = result.value!;
  await validateInvitationToken(repo, details.token);
  // The database revalidates the token and derives cohortId atomically in its
  // registration trigger. Neither cohortId nor role comes from caller input.
  return repo.registerViaInvitation(details);
}
