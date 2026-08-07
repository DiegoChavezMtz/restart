import { ForbiddenError, FormNotFoundError, InvalidFormStatusTransitionError } from "@/application/errors";
import type { Form, User } from "@/domain/entities";
import type { FormRepository } from "@/domain/repositories";

export async function closeForm(
  repo: FormRepository,
  input: { formId: string; requestedBy: User; adminAccessToken: string }
): Promise<Form> {
  if (input.requestedBy.role !== "admin" && input.requestedBy.role !== "super_admin") throw new ForbiddenError();

  const form = await repo.getFormById(input.formId, input.adminAccessToken);
  if (!form) throw new FormNotFoundError();
  if (form.status !== "published") {
    throw new InvalidFormStatusTransitionError(form.status, "closed");
  }

  return repo.setFormStatus(input.formId, "closed", input.adminAccessToken);
}

export async function archiveForm(
  repo: FormRepository,
  input: { formId: string; requestedBy: User; adminAccessToken: string }
): Promise<Form> {
  if (input.requestedBy.role !== "admin" && input.requestedBy.role !== "super_admin") throw new ForbiddenError();
  const form = await repo.getFormById(input.formId, input.adminAccessToken);
  if (!form) throw new FormNotFoundError();
  if (form.status === "published") {
    throw new InvalidFormStatusTransitionError(form.status, "archived");
  }
  return repo.setFormStatus(input.formId, "archived", input.adminAccessToken);
}

export async function restoreArchivedForm(
  repo: FormRepository,
  input: { formId: string; requestedBy: User; adminAccessToken: string }
): Promise<Form> {
  if (input.requestedBy.role !== "admin" && input.requestedBy.role !== "super_admin") throw new ForbiddenError();
  const form = await repo.getFormById(input.formId, input.adminAccessToken);
  if (!form) throw new FormNotFoundError();
  if (form.status !== "archived") {
    throw new InvalidFormStatusTransitionError(form.status, "closed");
  }
  return repo.setFormStatus(input.formId, "closed", input.adminAccessToken);
}
