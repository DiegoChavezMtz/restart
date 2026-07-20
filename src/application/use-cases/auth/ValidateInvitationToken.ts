import { InvitationNotFoundError } from "@/application/errors";
import type { AuthRepository } from "@/domain/repositories";

export async function validateInvitationToken(
  repo: AuthRepository,
  token: string
): Promise<{ cohortId: string }> {
  const normalizedToken = token.trim();
  if (!normalizedToken) throw new InvitationNotFoundError();
  const invitation = await repo.getInvitationByToken(normalizedToken);
  if (!invitation || !invitation.isActive) throw new InvitationNotFoundError();
  return { cohortId: invitation.cohortId };
}
