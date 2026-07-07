import type { QuestionOptionBranch } from "@/domain/entities";

interface QuestionOptionBranchRow {
  id: string;
  question_id: string;
  option_value: string;
  target_question_id: string | null;
  ends_form: boolean;
}

export function toDomainQuestionOptionBranch(row: QuestionOptionBranchRow): QuestionOptionBranch {
  return {
    id: row.id,
    questionId: row.question_id,
    optionValue: row.option_value,
    targetQuestionId: row.target_question_id,
    endsForm: row.ends_form,
  };
}
