import { CohortNotFoundError, ForbiddenError } from "@/application/errors";
import type { Cohort, User } from "@/domain/entities";
import type { CohortRepository } from "@/domain/repositories";

export async function getCohortParticipants(
  repo: CohortRepository,
  input: { cohortId: string; requestedBy: User; adminAccessToken: string }
): Promise<{ cohort: Cohort; participants: User[] }> {
  if (input.requestedBy.role !== "admin") throw new ForbiddenError();

  const cohort = await repo.getCohortById(input.cohortId, input.adminAccessToken);
  if (!cohort) throw new CohortNotFoundError();

  const participants = await repo.listParticipantsByCohort(
    input.cohortId,
    input.adminAccessToken
  );
  return { cohort, participants };
}
