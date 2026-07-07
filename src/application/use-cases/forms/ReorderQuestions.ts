import { ForbiddenError, FormNotFoundError } from "@/application/errors";
import type { Question, User } from "@/domain/entities";
import type { FormRepository } from "@/domain/repositories";
import { assertFormEditable } from "./EditFormQuestions";

export async function reorderQuestions(
  repo: FormRepository,
  input: {
    formId: string;
    orderedQuestionIds: string[];
    requestedBy: User;
    adminAccessToken: string;
  }
): Promise<Question[]> {
  if (input.requestedBy.role !== "admin") throw new ForbiddenError();

  const form = await repo.getFormById(input.formId, input.adminAccessToken);
  if (!form) throw new FormNotFoundError();

  await assertFormEditable(repo, input.formId, input.adminAccessToken);

  return repo.reorderQuestions(input.formId, input.orderedQuestionIds, input.adminAccessToken);
}
