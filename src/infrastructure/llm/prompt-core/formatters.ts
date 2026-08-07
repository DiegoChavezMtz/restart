import type { QuestionBreakdown } from "@/application/use-cases/reports/GetReportDataForCohortForm";

// Helpers de formateo compartidos entre los maquetadores de prompt.

export function formatAnswerValue(value: unknown): string {
  if (value === null || value === undefined) return "Sin responder";
  if (Array.isArray(value)) return value.join(", ");
  return String(value);
}

export function describeQuestionBreakdown(breakdown: QuestionBreakdown): string {
  const { question, likert, choice, openText } = breakdown;
  if (likert) {
    const distribution = likert.distribution.map((d) => `${d.value}:${d.count}`).join(", ");
    return `- "${question.label}" (escala): promedio ${likert.average}, distribución [${distribution}], sin responder ${likert.noAnswerCount}.`;
  }
  if (choice) {
    const options = choice.optionPercentages.map((o) => `${o.option} ${o.percent}%`).join(", ");
    return `- "${question.label}" (opción): ${options}, sin responder ${choice.noAnswerCount}.`;
  }
  if (openText) {
    const sample = openText.answers.slice(0, 15).map((a) => `"${a}"`).join("; ");
    return `- "${question.label}" (texto abierto), sin responder ${openText.noAnswerCount}. Muestra de respuestas: ${sample || "(ninguna)"}.`;
  }
  return `- "${question.label}": sin datos.`;
}
