import { CohortNotFoundError, ForbiddenError, FormNotFoundError, NoParticipantsFoundError } from "@/application/errors";
import type { Cohort, Form, FormResponseStatus, Question, User } from "@/domain/entities";
import { isMeaningfulAnswerValue, type AnswerValue } from "@/domain/value-objects";
import type { CohortRepository, FormRepository, StatsRepository } from "@/domain/repositories";
import {
  type ChoiceBreakdown,
  type LikertBreakdown,
  type OpenTextBreakdown,
} from "@/application/use-cases/stats/GetCohortStatsForForm";

export interface QuestionBreakdown {
  question: Question;
  likert?: LikertBreakdown;
  choice?: ChoiceBreakdown;
  openText?: OpenTextBreakdown;
}

export interface ParticipantAnswer {
  question: Question;
  value: AnswerValue | null;
}

export interface ParticipantReportEntry {
  participant: User;
  responseStatus: FormResponseStatus | "no_respondio";
  submittedAt: string | null;
  answers: ParticipantAnswer[];
}

export interface GetReportDataForCohortFormResult {
  cohort: Cohort;
  form: Form;
  totalParticipants: number;
  completedCount: number;
  completionRate: number;
  breakdown: QuestionBreakdown[];
  participants: ParticipantReportEntry[];
}

export async function getReportDataForCohortForm(
  statsRepo: StatsRepository,
  formRepo: FormRepository,
  cohortRepo: CohortRepository,
  input: { cohortId: string; formId: string; requestedBy: User; adminAccessToken: string }
): Promise<GetReportDataForCohortFormResult> {
  if (input.requestedBy.role !== "admin" && input.requestedBy.role !== "super_admin") throw new ForbiddenError();

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

  const eligibleParticipants = participants.filter((participant) => participant.role === "usuario");
  if (eligibleParticipants.length === 0) throw new NoParticipantsFoundError();

  const sortedQuestions = [...questions].sort((a, b) => a.order - b.order);
  const participantIds = new Set(eligibleParticipants.map((p) => p.id));
  const cohortResponses = responses.filter((r) => participantIds.has(r.participantId));
  const completedCount = cohortResponses.filter((r) => r.status === "completed").length;
  const totalParticipants = eligibleParticipants.length;
  const completionRate =
    totalParticipants > 0 ? Math.round((completedCount / totalParticipants) * 100) : 0;

  const cohortResponseIds = new Set(cohortResponses.map((r) => r.id));
  const cohortAnswers = answers.filter((a) => cohortResponseIds.has(a.responseId));

  const breakdown: QuestionBreakdown[] = sortedQuestions.map((question) => {
    const questionAnswers = cohortAnswers.filter((a) => a.questionId === question.id);
    const answered = questionAnswers.filter((a) => isMeaningfulAnswerValue(a.value));
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

    const openTextAnswers = answered.map((a) => a.value as string);
    return { question, openText: { answers: openTextAnswers, noAnswerCount } };
  });

  const responseByParticipant = new Map(cohortResponses.map((r) => [r.participantId, r]));
  const answersByResponseId = new Map<string, typeof cohortAnswers>();
  for (const answer of cohortAnswers) {
    const list = answersByResponseId.get(answer.responseId) ?? [];
    list.push(answer);
    answersByResponseId.set(answer.responseId, list);
  }

  const reportParticipants: ParticipantReportEntry[] = eligibleParticipants.map((participant) => {
    const response = responseByParticipant.get(participant.id);
    const responseAnswers = response ? answersByResponseId.get(response.id) ?? [] : [];
    const answersByQuestionId = new Map(responseAnswers.map((a) => [a.questionId, a]));

    return {
      participant,
      responseStatus: response ? response.status : "no_respondio",
      submittedAt: response?.submittedAt ?? null,
      answers: sortedQuestions.map((question) => ({
        question,
        value: answersByQuestionId.get(question.id)?.value ?? null,
      })),
    };
  });

  return {
    cohort,
    form,
    totalParticipants,
    completedCount,
    completionRate,
    breakdown,
    participants: reportParticipants,
  };
}
