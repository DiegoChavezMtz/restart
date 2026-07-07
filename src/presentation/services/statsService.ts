import type { Answer, Cohort, Form, FormResponse, FormSkill, Question, User } from "@/domain/entities";
import { axiosClient } from "./axiosClient";

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
  cohortId: string,
  formId: string
): Promise<GetCohortStatsForFormResult> {
  const { data } = await axiosClient.get<GetCohortStatsForFormResult>("/stats/cohort-form", {
    params: { cohortId, formId },
  });
  return data;
}

export interface SkillProfileEntry {
  skill: FormSkill;
  averagePercent: number;
}

export interface ParticipantHistoryEntry {
  response: FormResponse;
  form: Form;
  questions: Question[];
  answers: Answer[];
  skillProfile: SkillProfileEntry[] | null;
}

export interface GetParticipantHistoryResult {
  participant: User;
  history: ParticipantHistoryEntry[];
}

export async function getParticipantHistory(userId: string): Promise<GetParticipantHistoryResult> {
  const { data } = await axiosClient.get<GetParticipantHistoryResult>(
    `/stats/participants/${encodeURIComponent(userId)}`
  );
  return data;
}
