import { QuestionNotFoundError } from "@/application/errors";
import type { Question, QuestionOptionBranch } from "@/domain/entities";
import type { FormRepository } from "@/domain/repositories";
import type { AnswerValue } from "@/domain/value-objects";

/**
 * Pure branching algorithm — no I/O. Exported separately from
 * `resolveNextQuestion` so `FormPreviewModal` can call it directly with
 * already-loaded `questions`/`branches`, guaranteeing the preview matches
 * the real participant flow exactly (same function, not a re-implementation).
 */
export function resolveNextQuestionId(
  questions: Question[],
  branches: QuestionOptionBranch[],
  currentQuestionId: string,
  answerValue: AnswerValue | null
): string | "end_form" {
  const currentQuestion = questions.find((q) => q.id === currentQuestionId);
  if (!currentQuestion) throw new QuestionNotFoundError();

  if (currentQuestion.type === "single_choice" && typeof answerValue === "string") {
    const branch = branches.find(
      (b) => b.questionId === currentQuestionId && b.optionValue === answerValue
    );
    if (branch) return branch.endsForm ? "end_form" : (branch.targetQuestionId as string);
  }

  const next = questions
    .filter((q) => q.order > currentQuestion.order)
    .sort((a, b) => a.order - b.order)[0];
  return next ? next.id : "end_form";
}

export async function resolveNextQuestion(
  formRepo: FormRepository,
  input: {
    formId: string;
    currentQuestionId: string;
    answerValue: AnswerValue | null;
    accessToken: string;
  }
): Promise<string | "end_form"> {
  const [questions, branches] = await Promise.all([
    formRepo.listQuestionsByForm(input.formId, input.accessToken),
    formRepo.listQuestionOptionBranchesByForm(input.formId, input.accessToken),
  ]);
  return resolveNextQuestionId(questions, branches, input.currentQuestionId, input.answerValue);
}
