import { ForbiddenError } from "@/application/errors";
import type { Form, User } from "@/domain/entities";
import type { FormRepository } from "@/domain/repositories";

export function listForms(
  repo: FormRepository,
  input: { requestedBy: User; adminAccessToken: string }
): Promise<Form[]> {
  if (input.requestedBy.role !== "admin") throw new ForbiddenError();
  return repo.listForms(input.adminAccessToken);
}
