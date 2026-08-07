import { ForbiddenError, FormNotFoundError } from "@/application/errors";
import type {
  Form,
  FormAssignment,
  FormSkill,
  Question,
  QuestionOptionBranch,
  QuestionSkillWeight,
  User,
} from "@/domain/entities";
import type { FormRepository } from "@/domain/repositories";

export async function getForm(
  repo: FormRepository,
  input: { formId: string; requestedBy: User; adminAccessToken: string }
): Promise<{
  form: Form;
  questions: Question[];
  responseCount: number;
  skills: FormSkill[];
  questionSkillWeights: QuestionSkillWeight[];
  assignments: FormAssignment[];
  questionOptionBranches: QuestionOptionBranch[];
}> {
  if (input.requestedBy.role !== "admin" && input.requestedBy.role !== "super_admin") throw new ForbiddenError();

  const form = await repo.getFormById(input.formId, input.adminAccessToken);
  if (!form) throw new FormNotFoundError();

  const [questions, responseCount, skills, questionSkillWeights, assignments, questionOptionBranches] =
    await Promise.all([
      repo.listQuestionsByForm(input.formId, input.adminAccessToken),
      repo.countResponsesByForm(input.formId, input.adminAccessToken),
      repo.listFormSkills(input.formId, input.adminAccessToken),
      repo.listQuestionSkillWeightsByForm(input.formId, input.adminAccessToken),
      repo.listFormAssignments(input.formId, input.adminAccessToken),
      repo.listQuestionOptionBranchesByForm(input.formId, input.adminAccessToken),
    ]);

  return {
    form,
    questions,
    responseCount,
    skills,
    questionSkillWeights,
    assignments,
    questionOptionBranches,
  };
}
