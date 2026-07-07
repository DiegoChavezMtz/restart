import { ForbiddenError, FormNotFoundError } from "@/application/errors";
import type { Form, User } from "@/domain/entities";
import type { FormRepository } from "@/domain/repositories";

export async function toggleAcceptingResponses(
  repo: FormRepository,
  input: {
    formId: string;
    acceptingResponses: boolean;
    requestedBy: User;
    adminAccessToken: string;
  }
): Promise<Form> {
  if (input.requestedBy.role !== "admin") throw new ForbiddenError();

  const form = await repo.getFormById(input.formId, input.adminAccessToken);
  if (!form) throw new FormNotFoundError();

  // Deliberately no status precondition — the switch is independent of
  // status even for a closed form (docs/CONSTITUCION.md section 6.3).
  return repo.setAcceptingResponses(
    input.formId,
    input.acceptingResponses,
    input.adminAccessToken
  );
}
