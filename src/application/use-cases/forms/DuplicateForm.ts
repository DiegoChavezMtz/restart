import { ForbiddenError, FormNotFoundError } from "@/application/errors";
import type { Form, User } from "@/domain/entities";
import type { FormRepository } from "@/domain/repositories";

// The escape hatch for a form locked by existing responses (rule 3) — it
// must work precisely WHEN the source form is locked, so it deliberately
// never calls assertFormEditable. Only reads the source form; the new
// duplicate is created in 'draft' with zero FormAssignment rows.
export async function duplicateForm(
  repo: FormRepository,
  input: { formId: string; requestedBy: User; adminAccessToken: string }
): Promise<Form> {
  if (input.requestedBy.role !== "admin" && input.requestedBy.role !== "super_admin") throw new ForbiddenError();

  const source = await repo.getFormById(input.formId, input.adminAccessToken);
  if (!source) throw new FormNotFoundError();

  return repo.duplicateForm(
    input.formId,
    { createdBy: input.requestedBy.id },
    input.adminAccessToken
  );
}
