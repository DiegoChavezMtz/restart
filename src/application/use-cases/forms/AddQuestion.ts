import { ForbiddenError, FormNotFoundError, InvalidQuestionConfigError } from "@/application/errors";
import type { Question, User } from "@/domain/entities";
import type { FormRepository } from "@/domain/repositories";
import { validateQuestionConfig, type QuestionConfig, type QuestionType } from "@/domain/value-objects";
import { assertFormEditable } from "./EditFormQuestions";

export async function addQuestion(
  repo: FormRepository,
  input: {
    formId: string;
    label: string;
    type: QuestionType;
    config: QuestionConfig;
    required: boolean;
    timeLimitSeconds: number | null;
    requestedBy: User;
    adminAccessToken: string;
  }
): Promise<Question> {
  if (input.requestedBy.role !== "admin" && input.requestedBy.role !== "super_admin") throw new ForbiddenError();

  const form = await repo.getFormById(input.formId, input.adminAccessToken);
  if (!form) throw new FormNotFoundError();

  await assertFormEditable(repo, input.formId, input.adminAccessToken);

  const label = input.label.trim();
  if (label.length === 0) throw new InvalidQuestionConfigError("label no puede estar vacío.");
  if (input.timeLimitSeconds !== null && (!Number.isInteger(input.timeLimitSeconds) || input.timeLimitSeconds < 5)) {
    throw new InvalidQuestionConfigError("timeLimitSeconds debe ser null o un entero >= 5.");
  }

  const configError = validateQuestionConfig(input.config);
  if (configError) throw new InvalidQuestionConfigError(configError);

  return repo.addQuestion(
    {
      formId: input.formId,
      label,
      type: input.type,
      config: input.config,
      required: input.required,
      timeLimitSeconds: input.timeLimitSeconds,
    },
    input.adminAccessToken
  );
}
