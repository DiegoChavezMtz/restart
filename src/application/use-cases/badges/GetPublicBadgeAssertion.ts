import { BadgeAssertionNotFoundError } from "@/application/errors";
import type { PublicBadgeAssertion } from "@/domain/entities";
import type { BadgeRepository } from "@/domain/repositories";

export async function getPublicBadgeAssertion(
  repo: BadgeRepository,
  input: { id: string }
): Promise<PublicBadgeAssertion> {
  const assertion = await repo.getPublicBadgeAssertion(input.id);
  if (!assertion) throw new BadgeAssertionNotFoundError();
  return assertion;
}
