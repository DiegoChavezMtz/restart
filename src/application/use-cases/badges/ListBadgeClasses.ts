import { ForbiddenError } from "@/application/errors";
import type { BadgeClass, User } from "@/domain/entities";
import type { BadgeRepository } from "@/domain/repositories";

export function listBadgeClasses(
  repo: BadgeRepository,
  input: { requestedBy: User; adminAccessToken: string }
): Promise<BadgeClass[]> {
  if (input.requestedBy.role !== "admin" && input.requestedBy.role !== "super_admin") throw new ForbiddenError();
  return repo.listBadgeClasses(input.adminAccessToken);
}
