import type { AuthRepository, AuthSession } from "@/domain/repositories";
import { validateInvitationToken } from "./ValidateInvitationToken";

export async function registerViaInvitation(
  repo: AuthRepository,
  input: { token: string; email: string; password: string; fullName: string }
): Promise<AuthSession> {
  const { cohortId } = await validateInvitationToken(repo, input.token);
  // cohortId/role are never taken from caller input — always derived from the
  // validated invitation server-side.
  return repo.registerViaInvitation({ ...input, cohortId });
}
