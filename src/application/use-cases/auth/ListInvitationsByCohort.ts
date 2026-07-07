import { ForbiddenError } from "@/application/errors";
import type { Invitation, User } from "@/domain/entities";
import type { AuthRepository } from "@/domain/repositories";

export function listInvitationsByCohort(
  repo: AuthRepository,
  input: { cohortId: string; requestedBy: User; adminAccessToken: string }
): Promise<Invitation[]> {
  if (input.requestedBy.role !== "admin") throw new ForbiddenError();
  return repo.listInvitationsByCohort(input.cohortId, input.adminAccessToken);
}
