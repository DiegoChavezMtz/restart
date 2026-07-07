import {
  FormResponseAlreadyCompletedError,
  FormResponseNotFoundError,
  InvalidAnswerValueError,
  QuestionOutOfOrderError,
} from "@/application/errors";
import type { FormResponse, Question, User } from "@/domain/entities";
import type { FormRepository, ResponseRepository } from "@/domain/repositories";
import { validateAnswerValue, type AnswerValue } from "@/domain/value-objects";
import { resolveNextQuestion } from "./ResolveNextQuestion";

export async function submitAnswerAndAdvance(
  responseRepo: ResponseRepository,
  formRepo: FormRepository,
  input: {
    responseId: string;
    questionId: string;
    value: AnswerValue | null;
    autoSubmittedByTimeout: boolean;
    requestedBy: User;
    accessToken: string;
  }
): Promise<{ response: FormResponse; nextQuestion: Question | null }> {
  const responses = await responseRepo.listResponsesForParticipant(input.accessToken);
  const response = responses.find((r) => r.id === input.responseId);
  if (!response) throw new FormResponseNotFoundError();
  if (response.status === "completed") throw new FormResponseAlreadyCompletedError();
  if (response.currentQuestionId !== input.questionId) throw new QuestionOutOfOrderError();

  const currentQuestion = await formRepo.getQuestionById(
    response.formId,
    input.questionId,
    input.accessToken
  );
  if (!currentQuestion) throw new QuestionOutOfOrderError();

  if (input.autoSubmittedByTimeout) {
    // Rule 4: time running out always advances, with or without a selected
    // value — validation is deliberately skipped here.
    if (input.value !== null) {
      const valueError = validateAnswerValue(currentQuestion.config, input.value);
      if (valueError) throw new InvalidAnswerValueError(valueError);
    }
  } else {
    if (input.value === null) throw new InvalidAnswerValueError("value es requerido.");
    const valueError = validateAnswerValue(currentQuestion.config, input.value);
    if (valueError) throw new InvalidAnswerValueError(valueError);
  }

  await responseRepo.addAnswer(
    response.id,
    input.questionId,
    input.value,
    input.autoSubmittedByTimeout,
    input.accessToken
  );

  const resolved = await resolveNextQuestion(formRepo, {
    formId: response.formId,
    currentQuestionId: currentQuestion.id,
    answerValue: input.value,
    accessToken: input.accessToken,
  });

  const nextQuestionId = resolved === "end_form" ? null : resolved;
  const nextQuestion = nextQuestionId
    ? await formRepo.getQuestionById(response.formId, nextQuestionId, input.accessToken)
    : null;

  await responseRepo.advanceResponse(response.id, nextQuestionId, input.accessToken);
  const updatedResponse = nextQuestion
    ? await responseRepo.getResponse(response.formId, input.requestedBy.id, input.accessToken)
    : await responseRepo.completeResponse(response.id, input.accessToken);

  if (!updatedResponse) throw new FormResponseNotFoundError();

  return { response: updatedResponse, nextQuestion };
}
