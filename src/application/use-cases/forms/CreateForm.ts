import { ForbiddenError, InvalidQuestionConfigError } from "@/application/errors";
import type { Form, User } from "@/domain/entities";
import type { FormRepository } from "@/domain/repositories";

export function createForm(
  repo: FormRepository,
  input: { title: string; description: string | null; requestedBy: User; adminAccessToken: string }
): Promise<Form> {
  if (input.requestedBy.role !== "admin" && input.requestedBy.role !== "super_admin") throw new ForbiddenError();

  const title = input.title.trim();
  if (title.length === 0 || title.length > 200) {
    throw new InvalidQuestionConfigError("title debe tener entre 1 y 200 caracteres.");
  }

  return repo.createForm(
    { title, description: input.description, createdBy: input.requestedBy.id },
    input.adminAccessToken
  );
}
