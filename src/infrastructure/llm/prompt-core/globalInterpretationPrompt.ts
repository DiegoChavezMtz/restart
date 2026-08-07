import type { QuestionBreakdown } from "@/application/use-cases/reports/GetReportDataForCohortForm";
import { describeQuestionBreakdown } from "./formatters";

export interface GlobalInterpretationPromptInput {
  cohortName: string;
  formTitle: string;
  totalParticipants: number;
  completionRate: number;
  breakdown: QuestionBreakdown[];
}

// Único lugar donde se moldea el prompt de interpretación GENERAL
// (nivel financiero de toda la generación).
export function buildGlobalInterpretationPrompt(input: GlobalInterpretationPromptInput): string {
  return `Eres un analista de educación financiera. Analiza exclusivamente los resultados agregados de la cohorte "${input.cohortName}" en el formulario "${input.formTitle}".

          Participantes: ${input.totalParticipants}. Tasa de finalización: ${input.completionRate}%.

          Desglose por pregunta:${input.breakdown.map(describeQuestionBreakdown).join("\n")}

          Redacta una interpretación institucional del nivel general de conocimientos financieros de la cohorte. 
          Basa cada conclusión únicamente en patrones visibles en el desglose proporcionado, como porcentajes, distribución de respuestas, 
          preguntas con mayor o menor desempeño y tasa de finalización. Distingue con claridad entre hallazgos observados e 
          interpretaciones prudentes.

          No atribuyas resultados a edad, cultura, hábitos de consumo, ingresos, deudas, motivaciones, experiencia personal ni 
          otras características que no estén expresamente incluidas en los datos. No supongas que una respuesta implica un 
          comportamiento financiero real. Evita lenguaje alarmista, moralizante o estigmatizante.

          Incluye de manera constructiva las principales fortalezas, áreas prioritarias de aprendizaje y cualquier limitación de 
          los datos, especialmente si la tasa de finalización o el número de participantes limita la interpretación. Redacta en 
          español, en un solo párrafo de 150 a 250 palabras, con tono profesional y objetivo adecuado para un reporte institucional.
          No uses markdown, títulos ni listas; escribe solo texto corrido.`;
}
