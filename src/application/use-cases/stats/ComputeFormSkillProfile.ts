import type { Answer, FormSkill, Question, QuestionSkillWeight } from "@/domain/entities";

export interface SkillProfileEntry {
  skill: FormSkill;
  averagePercent: number; // 0-100, weighted average of normalized likert answers
}

/**
 * Pure function — no repo, no accessToken. Callers already have the raw data
 * loaded (from GetParticipantHistory today; from a future participant-facing
 * endpoint later, per docs/CONSTITUCION.md section 6.5's "arquitectura lista
 * para exponerlo al participante después sin cambios de esquema" — this
 * function needs no change either way).
 *
 * Formula (not specified by the doc): for each FormSkill, the weighted
 * average of its mapped Likert answers, each answer normalized to 0-100%
 * using that question's own scaleMin/scaleMax, weighted by
 * QuestionSkillWeight.weight. Unanswered questions (value: null) are
 * excluded from the average, never treated as 0. A skill with zero answered
 * contributing questions is omitted entirely (no forced 0 point).
 */
export function computeFormSkillProfile(
  questions: Question[],
  answers: Answer[],
  skills: FormSkill[],
  weights: QuestionSkillWeight[]
): SkillProfileEntry[] {
  const questionById = new Map(questions.map((q) => [q.id, q]));
  const answerByQuestionId = new Map(answers.map((a) => [a.questionId, a]));
  const bySkill = new Map<string, { weightedSum: number; weightTotal: number }>();

  for (const weight of weights) {
    const question = questionById.get(weight.questionId);
    const answer = answerByQuestionId.get(weight.questionId);
    if (!question || question.type !== "likert" || question.config.type !== "likert") continue;
    if (!answer || answer.value === null || typeof answer.value !== "number") continue;

    const { scaleMin, scaleMax } = question.config;
    const normalized = ((answer.value - scaleMin) / (scaleMax - scaleMin)) * 100;

    const entry = bySkill.get(weight.skillId) ?? { weightedSum: 0, weightTotal: 0 };
    entry.weightedSum += normalized * weight.weight;
    entry.weightTotal += weight.weight;
    bySkill.set(weight.skillId, entry);
  }

  return skills
    .filter((skill) => bySkill.has(skill.id))
    .map((skill) => {
      const entry = bySkill.get(skill.id)!;
      return { skill, averagePercent: Math.round(entry.weightedSum / entry.weightTotal) };
    });
}
