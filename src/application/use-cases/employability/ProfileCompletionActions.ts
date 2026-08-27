import { UseCaseError } from "@/application/errors";
import type { User } from "@/domain/entities";
import type { UserProfileRepository } from "@/domain/repositories";
import { assertEmploymentUser, isFullNameComplete, isValidPhone, optionalNullableText, requiredText } from "./profileHelpers";

type Context = { requestedBy: User; accessToken: string };

export type ProfileCompletionField = "fullName" | "phone" | "location";

export interface ProfileCompletionStatus {
  complete: boolean;
  missing: ProfileCompletionField[];
  fullName: string;
  phone: string;
  location: string;
  linkedinUrl: string | null;
}

function buildStatus(fullName: string, phone: string, location: string, linkedinUrl: string | null): ProfileCompletionStatus {
  const missing: ProfileCompletionField[] = [];
  if (!isFullNameComplete(fullName)) missing.push("fullName");
  if (!phone.trim()) missing.push("phone");
  if (!location.trim()) missing.push("location");
  return { complete: missing.length === 0, missing, fullName, phone, location, linkedinUrl };
}

export async function getProfileCompletionStatus(
  repo: UserProfileRepository,
  input: Context
): Promise<ProfileCompletionStatus> {
  assertEmploymentUser(input.requestedBy);
  const profile = await repo.getUserProfile(input.accessToken);
  return buildStatus(input.requestedBy.fullName, profile?.phone ?? "", profile?.location ?? "", profile?.linkedinUrl ?? null);
}

export async function completeUserProfile(
  repo: UserProfileRepository,
  input: Context & { fullName: unknown; phone: unknown; location: unknown; linkedinUrl: unknown }
): Promise<ProfileCompletionStatus> {
  assertEmploymentUser(input.requestedBy);

  const fullName = requiredText(input.fullName, "fullName", 120);
  if (!isFullNameComplete(fullName)) {
    throw new UseCaseError("Ingresa tu nombre completo (nombre y apellido).", 400);
  }

  const phone = requiredText(input.phone, "phone", 30);
  if (!isValidPhone(phone)) throw new UseCaseError("El teléfono no tiene un formato válido.", 400);

  const location = requiredText(input.location, "location", 160);
  const linkedinUrl = optionalNullableText(input.linkedinUrl, "linkedinUrl", 300) || null;

  if (fullName !== input.requestedBy.fullName) {
    await repo.updateOwnFullName(fullName, input.accessToken);
  }
  await repo.upsertUserProfile({ phone, location, linkedinUrl }, input.accessToken);

  return buildStatus(fullName, phone, location, linkedinUrl);
}
