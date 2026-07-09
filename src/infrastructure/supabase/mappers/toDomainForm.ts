import type { Form, FormStatus } from "@/domain/entities";

interface FormRow {
  id: string;
  title: string;
  description: string | null;
  status: string;
  accepting_responses: boolean;
  allows_partial_save: boolean;
  instructions_popup: string | null;
  deadline_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export function toDomainForm(row: FormRow): Form {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status as FormStatus,
    acceptingResponses: row.accepting_responses,
    allowsPartialSave: row.allows_partial_save,
    instructionsPopup: row.instructions_popup,
    deadlineAt: row.deadline_at,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
