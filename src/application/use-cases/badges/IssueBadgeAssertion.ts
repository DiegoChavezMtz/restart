import { BadgeClassNotFoundError, ForbiddenError, InvalidBadgeInputError } from "@/application/errors";
import type { BadgeAssertion, User } from "@/domain/entities";
import type { BadgeRepository } from "@/domain/repositories";

export async function issueBadgeAssertion(
  repo: BadgeRepository,
  input: {
    badgeClassId: string;
    recipientIds: string[];
    requestedBy: User;
    adminAccessToken: string;
  }
): Promise<BadgeAssertion[]> {
  if (input.requestedBy.role !== "admin" && input.requestedBy.role !== "super_admin") throw new ForbiddenError();
  if (input.recipientIds.length === 0) throw new InvalidBadgeInputError("recipientIds must not be empty.");

  const badgeClass = await repo.getBadgeClassById(input.badgeClassId, input.adminAccessToken);
  if (!badgeClass) throw new BadgeClassNotFoundError();

  const assertions: BadgeAssertion[] = [];
  for (const recipientId of input.recipientIds) {
    const assertion = await repo.issueBadgeAssertion(
      { badgeClassId: input.badgeClassId, recipientId, issuedBy: input.requestedBy.id },
      input.adminAccessToken
    );
    assertions.push(assertion);
  }
  return assertions;
}
