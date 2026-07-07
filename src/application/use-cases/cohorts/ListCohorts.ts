import { ForbiddenError } from "@/application/errors";
import type { Cohort, User } from "@/domain/entities";
import type { CohortRepository } from "@/domain/repositories";

export function listCohorts(
  repo: CohortRepository,
  input: { requestedBy: User; adminAccessToken: string }
): Promise<Cohort[]> {
  if (input.requestedBy.role !== "admin") throw new ForbiddenError();
  return repo.listCohorts(input.adminAccessToken);
}
