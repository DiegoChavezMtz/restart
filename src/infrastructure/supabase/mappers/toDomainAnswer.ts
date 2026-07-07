import type { Answer } from "@/domain/entities";
import type { AnswerValue } from "@/domain/value-objects";

interface AnswerRow {
  id: string;
  response_id: string;
  question_id: string;
  value: AnswerValue | null;
  auto_submitted_by_timeout: boolean;
}

export function toDomainAnswer(row: AnswerRow): Answer {
  return {
    id: row.id,
    responseId: row.response_id,
    questionId: row.question_id,
    value: row.value,
    autoSubmittedByTimeout: row.auto_submitted_by_timeout,
  };
}
