import {
  FormNotFoundError,
  FormSkillNotFoundError,
  ForbiddenError,
  InvalidSkillWeightError,
  QuestionNotFoundError,
  SkillWeightRequiresLikertQuestionError,
} from "@/application/errors";
import type { QuestionSkillWeight, User } from "@/domain/entities";
import type { FormRepository } from "@/domain/repositories";
import { validateQuestionSkillWeight } from "@/domain/value-objects";
import { assertFormEditable } from "./EditFormQuestions";

export async function setQuestionSkillWeight(
  repo: FormRepository,
  input: {
    formId: string;
    questionId: string;
    skillId: string;
    weight: number;
    requestedBy: User;
    adminAccessToken: string;
  }
): Promise<QuestionSkillWeight> {
  if (input.requestedBy.role !== "admin") throw new ForbiddenError();

  const form = await repo.getFormById(input.formId, input.adminAccessToken);
  if (!form) throw new FormNotFoundError();

  await assertFormEditable(repo, input.formId, input.adminAccessToken);

  const question = await repo.getQuestionById(input.formId, input.questionId, input.adminAccessToken);
  if (!question) throw new QuestionNotFoundError();
  if (question.type !== "likert") throw new SkillWeightRequiresLikertQuestionError();

  const weightError = validateQuestionSkillWeight(input.weight);
  if (weightError) throw new InvalidSkillWeightError(weightError);

  const skills = await repo.listFormSkills(input.formId, input.adminAccessToken);
  if (!skills.some((skill) => skill.id === input.skillId)) throw new FormSkillNotFoundError();

  return repo.setQuestionSkillWeight(
    input.formId,
    input.questionId,
    { skillId: input.skillId, weight: input.weight },
    input.adminAccessToken
  );
}
