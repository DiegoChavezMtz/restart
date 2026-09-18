import type { QualityEvaluationReport } from "@/application/use-cases/quality/GetQualityEvaluationReport";

export function buildQualityInterpretationPrompt(report: QualityEvaluationReport): string {
  const metrics = report.metrics.map((metric) =>
    `- ${metric.label}: n=${metric.answeredCount}; promedio=${metric.average ?? "sin datos"}/5; favorables (4-5)=${metric.favorablePercent ?? "sin datos"}%; distribución 1:${metric.distribution[0].count}, 2:${metric.distribution[1].count}, 3:${metric.distribution[2].count}, 4:${metric.distribution[3].count}, 5:${metric.distribution[4].count}.`
  ).join("\n");
  const byForm = report.forms.map((form) =>
    `- ${form.form.title}: ${form.completedResponseCount} respuestas completadas; ${form.metrics.map((metric) => `${metric.label} ${metric.average ?? "sin datos"}/5, ${metric.favorablePercent ?? "sin datos"}% favorable`).join("; ")}.`
  ).join("\n");

  return `Eres analista de Calidad e Investigación de Restart. Interpreta únicamente los datos agregados de una evaluación de sesiones. Se seleccionaron ${report.forms.length} formularios y hay ${report.completedResponseCount} respuestas completadas en total.\n\nResultados generales:\n${metrics}\n\nResultados por formulario:\n${byForm}\n\nRedacta en español tres párrafos breves con estos encabezados exactos: Hallazgos, Límites y Próximos pasos. Cada hallazgo debe citar al menos una cifra. Distingue entre una diferencia observada y una posible explicación: no atribuyas causas que los datos no miden. Señala muestras pequeñas o resultados sin datos. Propón preguntas de investigación o acciones de seguimiento concretas. No uses Markdown, viñetas ni afirmes que esto es un NPS.`;
}
