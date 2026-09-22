import type { BadgeAssertion, BadgeClass } from "@/domain/entities";
import type { BadgeRepository } from "@/domain/repositories";

export function listMyBadgeAssertions(
  repo: BadgeRepository,
  input: { accessToken: string }
): Promise<Array<BadgeAssertion & { badgeClass: BadgeClass }>> {
  return repo.listMyBadgeAssertions(input.accessToken);
}
