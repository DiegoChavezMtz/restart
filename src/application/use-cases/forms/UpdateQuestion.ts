import { ForbiddenError, FormNotFoundError, InvalidQuestionConfigError } from "@/application/errors";
import type { Question, User } from "@/domain/entities";
import type { FormRepository, UpdateQuestionInput } from "@/domain/repositories";
import { validateQuestionConfig } from "@/domain/value-objects";
import { assertFormEditable } from "./EditFormQuestions";

export async function updateQuestion(
  repo: FormRepository,
  input: UpdateQuestionInput & {
    formId: string;
    questionId: string;
    requestedBy: User;
    adminAccessToken: string;
  }
): Promise<Question> {
  if (input.requestedBy.role !== "admin" && input.requestedBy.role !== "super_admin") throw new ForbiddenError();

  const form = await repo.getFormById(input.formId, input.adminAccessToken);
  if (!form) throw new FormNotFoundError();

  await assertFormEditable(repo, input.formId, input.adminAccessToken);

  if (input.label !== undefined && input.label.trim().length === 0) {
    throw new InvalidQuestionConfigError("label no puede estar vacío.");
  }
  if (
    input.timeLimitSeconds !== undefined &&
    input.timeLimitSeconds !== null &&
    (!Number.isInteger(input.timeLimitSeconds) || input.timeLimitSeconds < 5)
  ) {
    throw new InvalidQuestionConfigError("timeLimitSeconds debe ser null o un entero >= 5.");
  }
  if (input.config !== undefined) {
    const configError = validateQuestionConfig(input.config);
    if (configError) throw new InvalidQuestionConfigError(configError);
  }

  return repo.updateQuestion(
    input.formId,
    input.questionId,
    {
      label: input.label?.trim(),
      type: input.type,
      config: input.config,
      required: input.required,
      timeLimitSeconds: input.timeLimitSeconds,
    },
    input.adminAccessToken
  );
}
