import { ForbiddenError, InvalidBadgeInputError } from "@/application/errors";
import type { BadgeClass, User } from "@/domain/entities";
import type { BadgeRepository, UpdateBadgeClassInput } from "@/domain/repositories";

const ALLOWED_IMAGE_TYPES = ["image/svg+xml", "image/png"];

export function updateBadgeClass(
  repo: BadgeRepository,
  input: UpdateBadgeClassInput & { id: string; requestedBy: User; adminAccessToken: string }
): Promise<BadgeClass> {
  if (input.requestedBy.role !== "admin" && input.requestedBy.role !== "super_admin") throw new ForbiddenError();
  if (input.imageFile && !ALLOWED_IMAGE_TYPES.includes(input.imageFile.type)) {
    throw new InvalidBadgeInputError("image must be one of: image/svg+xml, image/png.");
  }

  return repo.updateBadgeClass(
    input.id,
    {
      name: input.name?.trim(),
      description: input.description?.trim(),
      criteria: input.criteria?.trim(),
      imageFile: input.imageFile,
      validMonths: input.validMonths,
    },
    input.adminAccessToken
  );
}
