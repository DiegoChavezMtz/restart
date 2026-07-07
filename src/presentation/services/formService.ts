import type {
  Form,
  FormAssignment,
  FormAssignmentTargetType,
  FormSkill,
  FormStatus,
  Question,
  QuestionSkillWeight,
} from "@/domain/entities";
import type { QuestionConfig, QuestionType } from "@/domain/value-objects";
import { axiosClient } from "./axiosClient";

export async function listForms(): Promise<Form[]> {
  const { data } = await axiosClient.get<Form[]>("/forms");
  return data;
}

export async function createForm(input: { title: string; description: string | null }): Promise<Form> {
  const { data } = await axiosClient.post<Form>("/forms", input);
  return data;
}

export interface GetFormResult {
  form: Form;
  questions: Question[];
  responseCount: number;
  skills: FormSkill[];
  questionSkillWeights: QuestionSkillWeight[];
  assignments: FormAssignment[];
}

export async function getForm(formId: string): Promise<GetFormResult> {
  const { data } = await axiosClient.get<GetFormResult>(`/forms/${encodeURIComponent(formId)}`);
  return data;
}

export async function updateFormDetails(
  formId: string,
  input: { title?: string; description?: string | null; allowsPartialSave?: boolean }
): Promise<Form> {
  const { data } = await axiosClient.patch<Form>(`/forms/${encodeURIComponent(formId)}`, input);
  return data;
}

export async function setFormStatus(
  formId: string,
  status: Extract<FormStatus, "published" | "closed">
): Promise<Form> {
  const { data } = await axiosClient.patch<Form>(`/forms/${encodeURIComponent(formId)}/status`, {
    status,
  });
  return data;
}

export async function setAcceptingResponses(
  formId: string,
  acceptingResponses: boolean
): Promise<Form> {
  const { data } = await axiosClient.patch<Form>(
    `/forms/${encodeURIComponent(formId)}/accepting-responses`,
    { acceptingResponses }
  );
  return data;
}

export async function addQuestion(
  formId: string,
  input: {
    label: string;
    type: QuestionType;
    config: QuestionConfig;
    required: boolean;
    timeLimitSeconds: number | null;
  }
): Promise<Question> {
  const { data } = await axiosClient.post<Question>(
    `/forms/${encodeURIComponent(formId)}/questions`,
    input
  );
  return data;
}

export async function updateQuestion(
  formId: string,
  questionId: string,
  input: {
    label?: string;
    type?: QuestionType;
    config?: QuestionConfig;
    required?: boolean;
    timeLimitSeconds?: number | null;
  }
): Promise<Question> {
  const { data } = await axiosClient.patch<Question>(
    `/forms/${encodeURIComponent(formId)}/questions/${encodeURIComponent(questionId)}`,
    input
  );
  return data;
}

export async function deleteQuestion(formId: string, questionId: string): Promise<void> {
  await axiosClient.delete(
    `/forms/${encodeURIComponent(formId)}/questions/${encodeURIComponent(questionId)}`
  );
}

export async function reorderQuestions(
  formId: string,
  orderedQuestionIds: string[]
): Promise<Question[]> {
  const { data } = await axiosClient.patch<Question[]>(
    `/forms/${encodeURIComponent(formId)}/questions/reorder`,
    { orderedQuestionIds }
  );
  return data;
}

export async function createFormSkill(
  formId: string,
  input: { name: string; description: string | null; icon?: string; color?: string }
): Promise<FormSkill> {
  const { data } = await axiosClient.post<FormSkill>(
    `/forms/${encodeURIComponent(formId)}/skills`,
    input
  );
  return data;
}

export async function updateFormSkill(
  formId: string,
  skillId: string,
  input: { name?: string; description?: string | null; icon?: string | null; color?: string | null }
): Promise<FormSkill> {
  const { data } = await axiosClient.patch<FormSkill>(
    `/forms/${encodeURIComponent(formId)}/skills/${encodeURIComponent(skillId)}`,
    input
  );
  return data;
}

export async function deleteFormSkill(formId: string, skillId: string): Promise<void> {
  await axiosClient.delete(
    `/forms/${encodeURIComponent(formId)}/skills/${encodeURIComponent(skillId)}`
  );
}

export async function setQuestionSkillWeight(
  formId: string,
  questionId: string,
  input: { skillId: string; weight: number }
): Promise<QuestionSkillWeight> {
  const { data } = await axiosClient.patch<QuestionSkillWeight>(
    `/forms/${encodeURIComponent(formId)}/questions/${encodeURIComponent(questionId)}/skill-weight`,
    input
  );
  return data;
}

export async function clearQuestionSkillWeight(formId: string, questionId: string): Promise<void> {
  await axiosClient.delete(
    `/forms/${encodeURIComponent(formId)}/questions/${encodeURIComponent(questionId)}/skill-weight`
  );
}

export async function setFormAssignments(
  formId: string,
  targets: { targetType: FormAssignmentTargetType; targetId: string }[]
): Promise<FormAssignment[]> {
  const { data } = await axiosClient.patch<FormAssignment[]>(
    `/forms/${encodeURIComponent(formId)}/assignments`,
    { targets }
  );
  return data;
}

export async function duplicateForm(formId: string): Promise<Form> {
  const { data } = await axiosClient.post<Form>(`/forms/${encodeURIComponent(formId)}/duplicate`);
  return data;
}
