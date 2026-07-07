import { CohortNotFoundError, ForbiddenError, FormNotFoundError } from "@/application/errors";
import type { Cohort, Form, Question, User } from "@/domain/entities";
import type { CohortRepository, FormRepository, StatsRepository } from "@/domain/repositories";

export interface LikertBreakdown {
  average: number;
  distribution: { value: number; count: number }[];
  noAnswerCount: number;
}

export interface ChoiceBreakdown {
  optionPercentages: { option: string; percent: number; count: number }[];
  noAnswerCount: number;
}

export interface OpenTextBreakdown {
  answers: string[];
  noAnswerCount: number;
}

export interface QuestionBreakdown {
  question: Question;
  likert?: LikertBreakdown;
  choice?: ChoiceBreakdown;
  openText?: OpenTextBreakdown;
}

export interface GetCohortStatsForFormResult {
  cohort: Cohort;
  form: Form;
  totalParticipants: number;
  completedCount: number;
  completionRate: number;
  breakdown: QuestionBreakdown[];
}

export async function getCohortStatsForForm(
  statsRepo: StatsRepository,
  formRepo: FormRepository,
  cohortRepo: CohortRepository,
  input: { cohortId: string; formId: string; requestedBy: User; adminAccessToken: string }
): Promise<GetCohortStatsForFormResult> {
  if (input.requestedBy.role !== "admin") throw new ForbiddenError();

  const [cohort, form] = await Promise.all([
    cohortRepo.getCohortById(input.cohortId, input.adminAccessToken),
    formRepo.getFormById(input.formId, input.adminAccessToken),
  ]);
  if (!cohort) throw new CohortNotFoundError();
  if (!form) throw new FormNotFoundError();

  const [participants, questions, responses, answers] = await Promise.all([
    cohortRepo.listParticipantsByCohort(input.cohortId, input.adminAccessToken),
    formRepo.listQuestionsByForm(input.formId, input.adminAccessToken),
    statsRepo.listResponsesByForm(input.formId, input.adminAccessToken),
    statsRepo.listAnswersByForm(input.formId, input.adminAccessToken),
  ]);

  const participantIds = new Set(participants.map((p) => p.id));
  const cohortResponses = responses.filter((r) => participantIds.has(r.participantId));
  const completedCount = cohortResponses.filter((r) => r.status === "completed").length;
  const totalParticipants = participants.length;
  const completionRate =
    totalParticipants > 0 ? Math.round((completedCount / totalParticipants) * 100) : 0;

  const cohortResponseIds = new Set(cohortResponses.map((r) => r.id));
  const cohortAnswers = answers.filter((a) => cohortResponseIds.has(a.responseId));

  const breakdown: QuestionBreakdown[] = questions
    .sort((a, b) => a.order - b.order)
    .map((question) => {
      const questionAnswers = cohortAnswers.filter((a) => a.questionId === question.id);
      const answered = questionAnswers.filter((a) => a.value !== null);
      const noAnswerCount = questionAnswers.length - answered.length;

      if (question.type === "likert" && question.config.type === "likert") {
        const { scaleMin, scaleMax } = question.config;
        const values = answered.map((a) => a.value as number);
        const average = values.length
          ? Math.round((values.reduce((sum, v) => sum + v, 0) / values.length) * 100) / 100
          : 0;
        const distribution = Array.from(
          { length: scaleMax - scaleMin + 1 },
          (_, i) => scaleMin + i
        ).map((value) => ({ value, count: values.filter((v) => v === value).length }));
        return { question, likert: { average, distribution, noAnswerCount } };
      }

      if (
        (question.type === "single_choice" && question.config.type === "single_choice") ||
        (question.type === "checkbox" && question.config.type === "checkbox")
      ) {
        const options = question.config.options;
        const total = answered.length;
        const optionPercentages = options.map((option) => {
          const count = answered.filter((a) =>
            Array.isArray(a.value) ? a.value.includes(option) : a.value === option
          ).length;
          return { option, count, percent: total > 0 ? Math.round((count / total) * 100) : 0 };
        });
        return { question, choice: { optionPercentages, noAnswerCount } };
      }

      // open_text
      const openTextAnswers = answered.map((a) => a.value as string);
      return { question, openText: { answers: openTextAnswers, noAnswerCount } };
    });

  return { cohort, form, totalParticipants, completedCount, completionRate, breakdown };
}
