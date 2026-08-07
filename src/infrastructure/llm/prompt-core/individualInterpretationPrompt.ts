import type { ParticipantAnswer } from "@/application/use-cases/reports/GetReportDataForCohortForm";
import { isMeaningfulAnswerValue } from "@/domain/value-objects";
import { formatAnswerValue } from "./formatters";

export interface IndividualInterpretationPromptInput {
  participantName: string;
  formTitle: string;
  answers: ParticipantAnswer[];
}

/** Conserva solo las respuestas que pueden sustentar una interpretación. */
function getMeaningfulAnswers(answers: ParticipantAnswer[]): ParticipantAnswer[] {
  return answers.filter((answer) => isMeaningfulAnswerValue(answer.value));
}

// Único lugar donde se moldea el prompt de interpretación INDIVIDUAL
// (nivel financiero de un participante).
export function buildIndividualInterpretationPrompt(
  input: IndividualInterpretationPromptInput
): string {
  const answerLines = getMeaningfulAnswers(input.answers)
    .map((a) => `- ${a.question.label}: ${formatAnswerValue(a.value)}`)
    .join("\n");

  return `Eres un analista de educación financiera. 
            Analiza exclusivamente las respuestas proporcionadas por "${input.participantName}" en el formulario "${input.formTitle}".

            Respuestas:${answerLines}

            Elabora una interpretación educativa de su nivel de conocimientos financieros basándote únicamente en la evidencia 
            disponible en sus respuestas. Identifica de forma constructiva sus posibles fortalezas, áreas de aprendizaje y el 
            grado de seguridad de la evaluación cuando corresponda. No asumas ingresos, patrimonio, perfil de riesgo, experiencia 
            financiera ni características personales que no estén explícitamente indicadas.

            Redacta en español, en un único párrafo de 150 a 200 palabras, con tono profesional, claro y constructivo. 
            Esta interpretación es educativa y no constituye asesoría financiera, recomendación de inversión ni diagnóstico definitivo.

            No uses markdown, títulos ni listas; escribe solo texto corrido. 
            Si la información es insuficiente para evaluar su conocimiento, indícalo brevemente sin especular sobre su nivel.`;
}
