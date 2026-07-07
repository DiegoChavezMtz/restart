import {
  FormResponseAlreadyCompletedError,
  FormResponseNotFoundError,
  InvalidAnswerValueError,
  QuestionOutOfOrderError,
} from "@/application/errors";
import type { FormResponse, Question, User } from "@/domain/entities";
import type { FormRepository, ResponseRepository } from "@/domain/repositories";
import { validateAnswerValue, type AnswerValue } from "@/domain/value-objects";

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

  const questions = await formRepo.listQuestionsByForm(response.formId, input.accessToken);
  const currentQuestion = questions[response.currentQuestionOrder];
  if (!currentQuestion || currentQuestion.id !== input.questionId) {
    throw new QuestionOutOfOrderError();
  }

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

  const newOrder = response.currentQuestionOrder + 1;
  const nextQuestion = questions[newOrder] ?? null;

  await responseRepo.advanceResponse(response.id, newOrder, input.accessToken);
  const updatedResponse = nextQuestion
    ? await responseRepo.getResponse(response.formId, input.requestedBy.id, input.accessToken)
    : await responseRepo.completeResponse(response.id, input.accessToken);

  if (!updatedResponse) throw new FormResponseNotFoundError();

  return { response: updatedResponse, nextQuestion };
}
