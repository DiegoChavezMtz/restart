import { FormNotFoundError } from "@/application/errors";
import type { Answer, Form, FormResponse, Question, User } from "@/domain/entities";
import type { FormRepository, ResponseRepository } from "@/domain/repositories";

export async function resumeFormResponse(
  responseRepo: ResponseRepository,
  formRepo: FormRepository,
  input: { formId: string; requestedBy: User; accessToken: string }
): Promise<{ response: FormResponse; questions: Question[]; answers: Answer[]; form: Form }> {
  const form = await formRepo.getFormById(input.formId, input.accessToken);
  if (!form) throw new FormNotFoundError();

  const questions = await formRepo.listQuestionsByForm(input.formId, input.accessToken);
  const firstQuestionId = questions[0]?.id ?? null;
  const response = await responseRepo.resumeParticipantResponse(input.formId, input.accessToken);

  const answers =
    response.currentQuestionId !== firstQuestionId || response.status === "completed"
      ? await responseRepo.listAnswersByResponse(response.id, input.accessToken)
      : [];

  return { response, questions, answers, form };
}
