import { ForbiddenError } from "@/application/errors";
import type { Cohort, User } from "@/domain/entities";
import type { CohortRepository, CreateCohortInput } from "@/domain/repositories";

export function createCohort(
  repo: CohortRepository,
  input: CreateCohortInput & { requestedBy: User; adminAccessToken: string }
): Promise<Cohort> {
  if (input.requestedBy.role !== "admin") throw new ForbiddenError();
  return repo.createCohort(
    { name: input.name, description: input.description },
    input.adminAccessToken
  );
}
