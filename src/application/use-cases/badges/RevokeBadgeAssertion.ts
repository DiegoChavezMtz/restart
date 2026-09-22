import { ForbiddenError } from "@/application/errors";
import type { BadgeAssertion, User } from "@/domain/entities";
import type { BadgeRepository } from "@/domain/repositories";

export function revokeBadgeAssertion(
  repo: BadgeRepository,
  input: { id: string; requestedBy: User; adminAccessToken: string }
): Promise<BadgeAssertion> {
  if (input.requestedBy.role !== "admin" && input.requestedBy.role !== "super_admin") throw new ForbiddenError();
  return repo.revokeBadgeAssertion(input.id, input.requestedBy.id, input.adminAccessToken);
}
