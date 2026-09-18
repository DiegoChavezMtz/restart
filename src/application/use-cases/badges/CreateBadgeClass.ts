import { ForbiddenError, InvalidBadgeInputError } from "@/application/errors";
import type { BadgeClass, User } from "@/domain/entities";
import type { BadgeRepository } from "@/domain/repositories";

const ALLOWED_IMAGE_TYPES = ["image/svg+xml", "image/png"];

export async function createBadgeClass(
  repo: BadgeRepository,
  input: {
    name: string;
    description: string;
    criteria: string;
    imageFile: File | null;
    validMonths: number | null;
    requestedBy: User;
    adminAccessToken: string;
  }
): Promise<BadgeClass> {
  if (input.requestedBy.role !== "admin" && input.requestedBy.role !== "super_admin") throw new ForbiddenError();

  const name = input.name.trim();
  if (!name) throw new InvalidBadgeInputError("name is required.");
  if (input.imageFile && !ALLOWED_IMAGE_TYPES.includes(input.imageFile.type)) {
    throw new InvalidBadgeInputError("image must be one of: image/svg+xml, image/png.");
  }

  const issuers = await repo.listIssuers(input.adminAccessToken);
  const issuer = issuers[0];
  if (!issuer) throw new InvalidBadgeInputError("No badge issuer is configured yet.");

  return repo.createBadgeClass(
    {
      issuerId: issuer.id,
      name,
      description: input.description.trim(),
      criteria: input.criteria.trim(),
      imageFile: input.imageFile,
      validMonths: input.validMonths,
    },
    input.adminAccessToken
  );
}
