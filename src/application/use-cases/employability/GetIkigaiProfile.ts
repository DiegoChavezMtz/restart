import { ForbiddenError } from "@/application/errors";
import type { IkigaiProfile, User } from "@/domain/entities";
import type { IkigaiRepository } from "@/domain/repositories";

export async function getIkigaiProfile(
  repo: IkigaiRepository,
  input: { requestedBy: User; accessToken: string }
): Promise<IkigaiProfile | null> {
  if (input.requestedBy.role !== "usuario" && input.requestedBy.role !== "test") throw new ForbiddenError();
  return repo.getIkigaiProfile(input.accessToken);
}
