import { ForbiddenError, FormNotFoundError } from "@/application/errors";
import type { User } from "@/domain/entities";
import type { FormRepository } from "@/domain/repositories";
import { assertFormEditable } from "./EditFormQuestions";

export async function clearQuestionSkillWeight(
  repo: FormRepository,
  input: { formId: string; questionId: string; requestedBy: User; adminAccessToken: string }
): Promise<void> {
  if (input.requestedBy.role !== "admin") throw new ForbiddenError();

  const form = await repo.getFormById(input.formId, input.adminAccessToken);
  if (!form) throw new FormNotFoundError();

  await assertFormEditable(repo, input.formId, input.adminAccessToken);

  return repo.clearQuestionSkillWeight(input.formId, input.questionId, input.adminAccessToken);
}
