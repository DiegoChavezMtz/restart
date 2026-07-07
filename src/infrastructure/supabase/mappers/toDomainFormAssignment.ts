import type { FormAssignment, FormAssignmentTargetType } from "@/domain/entities";

interface FormAssignmentRow {
  id: string;
  form_id: string;
  target_type: string;
  target_id: string;
}

export function toDomainFormAssignment(row: FormAssignmentRow): FormAssignment {
  return {
    id: row.id,
    formId: row.form_id,
    targetType: row.target_type as FormAssignmentTargetType,
    targetId: row.target_id,
  };
}
