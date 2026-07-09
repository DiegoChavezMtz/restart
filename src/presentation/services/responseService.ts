import type { Answer, Form, FormResponse, FormResponseStatus, Question } from "@/domain/entities";
import type { AnswerValue } from "@/domain/value-objects";
import { axiosClient } from "./axiosClient";

export interface VisibleForm {
  form: Form;
  status: "not_started" | FormResponseStatus;
}

export async function listVisibleForms(): Promise<VisibleForm[]> {
  const { data } = await axiosClient.get<VisibleForm[]>("/responses/visible-forms");
  return data;
}

export interface ResumeFormResponseResult {
  response: FormResponse;
  questions: Question[];
  answers: Answer[];
  form: Form;
}

export async function resumeFormResponse(formId: string): Promise<ResumeFormResponseResult> {
  const { data } = await axiosClient.post<ResumeFormResponseResult>(
    `/responses/forms/${encodeURIComponent(formId)}`
  );
  return data;
}

export interface SubmitAnswerResult {
  response: FormResponse;
  nextQuestion: Question | null;
}

export async function submitAnswerAndAdvance(
  responseId: string,
  questionId: string,
  value: AnswerValue | null,
  autoSubmittedByTimeout = false
): Promise<SubmitAnswerResult> {
  const { data } = await axiosClient.post<SubmitAnswerResult>(
    `/responses/${encodeURIComponent(responseId)}/answers`,
    { questionId, value, autoSubmittedByTimeout }
  );
  return data;
}
