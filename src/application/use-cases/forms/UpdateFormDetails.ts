import { ForbiddenError, FormNotFoundError, InvalidQuestionConfigError } from "@/application/errors";
import type { Form, User } from "@/domain/entities";
import type { FormRepository, UpdateFormDetailsInput } from "@/domain/repositories";

export async function updateFormDetails(
  repo: FormRepository,
  input: UpdateFormDetailsInput & { formId: string; requestedBy: User; adminAccessToken: string }
): Promise<Form> {
  if (input.requestedBy.role !== "admin") throw new ForbiddenError();

  const existing = await repo.getFormById(input.formId, input.adminAccessToken);
  if (!existing) throw new FormNotFoundError();

  if (input.title !== undefined) {
    const title = input.title.trim();
    if (title.length === 0 || title.length > 200) {
      throw new InvalidQuestionConfigError("title debe tener entre 1 y 200 caracteres.");
    }
  }

  return repo.updateFormDetails(
    input.formId,
    {
      title: input.title?.trim(),
      description: input.description,
      allowsPartialSave: input.allowsPartialSave,
      instructionsPopup: input.instructionsPopup,
    },
    input.adminAccessToken
  );
}
