import { ForbiddenError } from "@/application/errors";
import type { AuthRepository } from "@/domain/repositories";
import type { Invitation, User } from "@/domain/entities";

export function generateInvitationLink(
  repo: AuthRepository,
  input: { cohortId: string; requestedBy: User; adminAccessToken: string; intendedRole?: "usuario" | "test" }
): Promise<Invitation> {
  // Defense in depth on top of RLS — the DB policy already enforces
  // is_admin(), this is a fast, explicit domain-level check as well.
  if (input.requestedBy.role !== "admin" && input.requestedBy.role !== "super_admin") throw new ForbiddenError();
  return repo.generateInvitation(
    input.cohortId,
    input.requestedBy.id,
    input.adminAccessToken,
    input.intendedRole ?? "usuario"
  );
}
