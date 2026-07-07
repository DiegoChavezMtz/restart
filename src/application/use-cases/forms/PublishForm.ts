import { ForbiddenError, FormNotFoundError, InvalidFormStatusTransitionError } from "@/application/errors";
import type { Form, User } from "@/domain/entities";
import type { FormRepository } from "@/domain/repositories";

export async function publishForm(
  repo: FormRepository,
  input: { formId: string; requestedBy: User; adminAccessToken: string }
): Promise<Form> {
  if (input.requestedBy.role !== "admin") throw new ForbiddenError();

  const form = await repo.getFormById(input.formId, input.adminAccessToken);
  if (!form) throw new FormNotFoundError();
  if (form.status !== "draft") {
    throw new InvalidFormStatusTransitionError(form.status, "published");
  }

  return repo.setFormStatus(input.formId, "published", input.adminAccessToken);
}
