import type { QuestionSkillWeight } from "@/domain/entities";

interface QuestionSkillWeightRow {
  id: string;
  question_id: string;
  skill_id: string;
  weight: number;
}

export function toDomainQuestionSkillWeight(row: QuestionSkillWeightRow): QuestionSkillWeight {
  return {
    id: row.id,
    questionId: row.question_id,
    skillId: row.skill_id,
    weight: row.weight,
  };
}
