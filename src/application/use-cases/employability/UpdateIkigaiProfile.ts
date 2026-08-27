import { ForbiddenError, UseCaseError } from "@/application/errors";
import type { IkigaiProfile, User } from "@/domain/entities";
import type { IkigaiRepository, UpdateIkigaiProfileInput } from "@/domain/repositories";

const MAX_FIELD_LENGTH = 5_000;
const WRITABLE_FIELDS = [
  "whatYouLove",
  "whatYouAreGoodAt",
  "whatWorldNeeds",
  "whatYouCanBePaidFor",
  "synthesis",
] as const;

export function updateIkigaiProfile(
  repo: IkigaiRepository,
  input: UpdateIkigaiProfileInput & { requestedBy: User; accessToken: string }
): Promise<IkigaiProfile> {
  if (input.requestedBy.role !== "usuario" && input.requestedBy.role !== "test") throw new ForbiddenError();

  const update: UpdateIkigaiProfileInput = {};
  for (const field of WRITABLE_FIELDS) {
    const value = input[field];
    if (value === undefined) continue;
    if (field === "synthesis" && value === null) {
      update.synthesis = null;
      continue;
    }
    if (typeof value !== "string") throw new UseCaseError(`${field} debe ser texto.`, 400);
    if (value.length > MAX_FIELD_LENGTH) {
      throw new UseCaseError(`${field} no puede exceder ${MAX_FIELD_LENGTH} caracteres.`, 400);
    }
    Object.assign(update, { [field]: value.trim() });
  }

  if (Object.keys(update).length === 0) {
    throw new UseCaseError("Incluye al menos un campo de ikigai para guardar.", 400);
  }
  return repo.upsertIkigaiProfile(update, input.accessToken);
}
