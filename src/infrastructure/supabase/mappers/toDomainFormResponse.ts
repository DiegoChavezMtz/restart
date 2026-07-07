import type { FormResponse, FormResponseStatus } from "@/domain/entities";

interface FormResponseRow {
  id: string;
  form_id: string;
  participant_id: string;
  status: string;
  current_question_order: number;
  submitted_at: string | null;
}

export function toDomainFormResponse(row: FormResponseRow): FormResponse {
  return {
    id: row.id,
    formId: row.form_id,
    participantId: row.participant_id,
    status: row.status as FormResponseStatus,
    currentQuestionOrder: row.current_question_order,
    submittedAt: row.submitted_at,
  };
}
