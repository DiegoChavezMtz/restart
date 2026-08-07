import {
  ForbiddenError,
  FormNotFoundError,
  InvalidQuestionOptionBranchError,
  QuestionNotFoundError,
} from "@/application/errors";
import type { QuestionOptionBranch, User } from "@/domain/entities";
import type { FormRepository, QuestionOptionBranchRuleInput } from "@/domain/repositories";
import { assertFormEditable } from "./EditFormQuestions";

export async function setQuestionOptionBranches(
  repo: FormRepository,
  input: {
    formId: string;
    questionId: string;
    branches: QuestionOptionBranchRuleInput[];
    requestedBy: User;
    adminAccessToken: string;
  }
): Promise<QuestionOptionBranch[]> {
  if (input.requestedBy.role !== "admin" && input.requestedBy.role !== "super_admin") throw new ForbiddenError();

  const form = await repo.getFormById(input.formId, input.adminAccessToken);
  if (!form) throw new FormNotFoundError();

  await assertFormEditable(repo, input.formId, input.adminAccessToken);

  const question = await repo.getQuestionById(input.formId, input.questionId, input.adminAccessToken);
  if (!question) throw new QuestionNotFoundError();
  if (question.type !== "single_choice" || question.config.type !== "single_choice") {
    throw new InvalidQuestionOptionBranchError(
      "Los saltos condicionales solo aplican a preguntas de tipo single_choice."
    );
  }

  const optionValues = new Set(input.branches.map((b) => b.optionValue));
  if (optionValues.size !== input.branches.length) {
    throw new InvalidQuestionOptionBranchError("No puede haber dos reglas para la misma opción.");
  }
  for (const branch of input.branches) {
    if (!question.config.options.includes(branch.optionValue)) {
      throw new InvalidQuestionOptionBranchError(
        `"${branch.optionValue}" no es una opción válida de esta pregunta.`
      );
    }
    const hasTarget = branch.targetQuestionId !== null;
    if (hasTarget === branch.endsForm) {
      throw new InvalidQuestionOptionBranchError(
        "Cada regla debe tener exactamente un destino: una pregunta o terminar el formulario."
      );
    }
  }

  const questions = await repo.listQuestionsByForm(input.formId, input.adminAccessToken);
  const questionsById = new Map(questions.map((q) => [q.id, q]));
  for (const branch of input.branches) {
    if (branch.targetQuestionId === null) continue;
    const target = questionsById.get(branch.targetQuestionId);
    if (!target) throw new QuestionNotFoundError();
    if (target.order <= question.order) {
      throw new InvalidQuestionOptionBranchError(
        "El destino de un salto debe estar después de la pregunta actual."
      );
    }
  }

  return repo.setQuestionOptionBranches(
    input.formId,
    input.questionId,
    input.branches,
    input.adminAccessToken
  );
}
