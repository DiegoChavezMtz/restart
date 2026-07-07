import type { Question } from "@/domain/entities";
import type { QuestionConfig, QuestionType } from "@/domain/value-objects";

interface QuestionRow {
  id: string;
  form_id: string;
  order: number;
  label: string;
  type: string;
  config: QuestionConfig;
  required: boolean;
  time_limit_seconds: number | null;
}

export function toDomainQuestion(row: QuestionRow): Question {
  return {
    id: row.id,
    formId: row.form_id,
    order: row.order,
    label: row.label,
    type: row.type as QuestionType,
    config: row.config,
    required: row.required,
    timeLimitSeconds: row.time_limit_seconds,
  };
}
