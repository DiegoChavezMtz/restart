import type { ParticipantReportEntry } from "./GetReportDataForCohortForm";
import { isMeaningfulAnswerValue } from "@/domain/value-objects";

export interface IndividualReportInterpretationPlan {
  answers: ParticipantReportEntry["answers"];
  fallbackInterpretation: string | null;
}

/**
 * Decide si la evidencia justifica una llamada al LLM. Esto evita pagar por
 * prompts compuestos únicamente por respuestas vacías o nulas.
 */
export function getIndividualReportInterpretationPlan(
  entry: ParticipantReportEntry
): IndividualReportInterpretationPlan {
  const answers = entry.answers.filter((answer) => isMeaningfulAnswerValue(answer.value));
  if (answers.length > 0) return { answers, fallbackInterpretation: null };

  if (entry.responseStatus === "no_respondio") {
    return {
      answers,
      fallbackInterpretation:
        "El participante no respondió el formulario, por lo que no hay información suficiente para elaborar una interpretación de su nivel de conocimientos financieros.",
    };
  }

  if (entry.responseStatus === "in_progress") {
    return {
      answers,
      fallbackInterpretation:
        "El participante no completó el formulario y no registró respuestas válidas, por lo que no es posible elaborar una interpretación de su nivel de conocimientos financieros.",
    };
  }

  return {
    answers,
    fallbackInterpretation:
      "El participante completó el formulario, pero no registró respuestas válidas; por ello no hay evidencia suficiente para elaborar una interpretación de su nivel de conocimientos financieros.",
  };
}
