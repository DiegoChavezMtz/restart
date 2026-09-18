import { BadgeClassNotFoundError, CohortNotFoundError, ForbiddenError } from "@/application/errors";
import type { Cohort, User } from "@/domain/entities";
import type { BadgeCandidate, BadgeRepository, CohortRepository } from "@/domain/repositories";

export async function listCohortCandidatesForBadge(
  repos: { badgeRepo: BadgeRepository; cohortRepo: CohortRepository },
  input: {
    cohortId: string;
    badgeClassId: string;
    requestedBy: User;
    adminAccessToken: string;
  }
): Promise<{ cohort: Cohort; candidates: BadgeCandidate[] }> {
  if (input.requestedBy.role !== "admin" && input.requestedBy.role !== "super_admin") throw new ForbiddenError();

  const cohort = await repos.cohortRepo.getCohortById(input.cohortId, input.adminAccessToken);
  if (!cohort) throw new CohortNotFoundError();

  const badgeClass = await repos.badgeRepo.getBadgeClassById(input.badgeClassId, input.adminAccessToken);
  if (!badgeClass) throw new BadgeClassNotFoundError();

  const candidates = await repos.badgeRepo.listCandidatesByCohort(
    input.cohortId,
    input.badgeClassId,
    input.adminAccessToken
  );
  return { cohort, candidates };
}
