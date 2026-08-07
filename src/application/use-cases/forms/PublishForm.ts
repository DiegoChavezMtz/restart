import { ForbiddenError, FormNotFoundError, InvalidFormStatusTransitionError, InvalidQuestionConfigError } from "@/application/errors";
import type { Form, User } from "@/domain/entities";
import type { FormRepository } from "@/domain/repositories";

export async function publishForm(
  repo: FormRepository,
  input: { formId: string; requestedBy: User; adminAccessToken: string }
): Promise<Form> {
  if (input.requestedBy.role !== "admin" && input.requestedBy.role !== "super_admin") throw new ForbiddenError();

  const form = await repo.getFormById(input.formId, input.adminAccessToken);
  if (!form) throw new FormNotFoundError();
  if (form.status !== "draft") {
    throw new InvalidFormStatusTransitionError(form.status, "published");
  }

  const [questions, assignments, branches] = await Promise.all([
    repo.listQuestionsByForm(input.formId, input.adminAccessToken),
    repo.listFormAssignments(input.formId, input.adminAccessToken),
    repo.listQuestionOptionBranchesByForm(input.formId, input.adminAccessToken),
  ]);
  if (questions.length === 0) {
    throw new InvalidQuestionConfigError("Agrega al menos una pregunta antes de publicar.");
  }
  if (assignments.length === 0) {
    throw new InvalidQuestionConfigError("Asigna al menos una audiencia antes de publicar.");
  }

  const orderByQuestionId = new Map(questions.map((question) => [question.id, question.order]));
  const hasInvalidBranch = branches.some((branch) => {
    if (branch.endsForm) return false;
    const sourceOrder = orderByQuestionId.get(branch.questionId);
    const targetOrder = branch.targetQuestionId
      ? orderByQuestionId.get(branch.targetQuestionId)
      : undefined;
    return sourceOrder === undefined || targetOrder === undefined || targetOrder <= sourceOrder;
  });
  if (hasInvalidBranch) {
    throw new InvalidQuestionConfigError("Corrige los saltos condicionales antes de publicar.");
  }

  return repo.setFormStatus(input.formId, "published", input.adminAccessToken);
}
