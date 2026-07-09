import { FormNotAcceptingResponsesError, FormNotFoundError } from "@/application/errors";
import type { Answer, Form, FormResponse, Question, User } from "@/domain/entities";
import type { FormRepository, ResponseRepository } from "@/domain/repositories";

export async function resumeFormResponse(
  responseRepo: ResponseRepository,
  formRepo: FormRepository,
  input: { formId: string; requestedBy: User; accessToken: string }
): Promise<{ response: FormResponse; questions: Question[]; answers: Answer[]; form: Form }> {
  const form = await formRepo.getFormById(input.formId, input.accessToken);
  if (!form) throw new FormNotFoundError();

  let response = await responseRepo.getResponse(
    input.formId,
    input.requestedBy.id,
    input.accessToken
  );

  if (response && response.status === "in_progress" && !form.allowsPartialSave) {
    // No partial save allowed: an abandoned in-progress response is
    // discarded and the participant starts fresh, per the decided behavior.
    await responseRepo.deleteResponse(response.id, input.accessToken);
    response = null;
  }

  const questions = await formRepo.listQuestionsByForm(input.formId, input.accessToken);
  const firstQuestionId = questions[0]?.id ?? null;

  if (!response) {
    if (!form.acceptingResponses) throw new FormNotAcceptingResponsesError();
    response = await responseRepo.createResponse(
      input.formId,
      input.requestedBy.id,
      firstQuestionId,
      input.accessToken
    );
  }

  const answers =
    response.currentQuestionId !== firstQuestionId || response.status === "completed"
      ? await responseRepo.listAnswersByResponse(response.id, input.accessToken)
      : [];

  return { response, questions, answers, form };
}
