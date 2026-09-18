import { ForbiddenError, InvalidQuestionConfigError } from "@/application/errors";
import type { Form, Question, User } from "@/domain/entities";
import type { FormRepository, StatsRepository } from "@/domain/repositories";

export const QUALITY_RESTART_TAG = "calidad-restart";

export const QUALITY_METRICS = [
  {
    key: "recommendation",
    label: "Recomendación",
    question: "¿Recomendarías esta sesión de Restart a otros jovenes?",
    favorableLabel: "Probablemente o definitivamente la recomendaría",
  },
  {
    key: "usefulness",
    label: "Utilidad percibida",
    question: "¿Qué tan útil consideras que fue el taller que recibiste hoy para tu aprendizaje o desarrollo?",
    favorableLabel: "Muy o extremadamente útil",
  },
  {
    key: "happiness",
    label: "Felicidad en Restart",
    question: "¿Qué tan feliz eres estando en Restart?",
    favorableLabel: "Muy o extremadamente feliz",
  },
] as const;

export type QualityMetricKey = (typeof QUALITY_METRICS)[number]["key"];

export interface QualityMetricResult {
  key: QualityMetricKey;
  label: string;
  favorableLabel: string;
  answeredCount: number;
  average: number | null;
  favorableCount: number;
  favorablePercent: number | null;
  distribution: { value: number; count: number }[];
}

export interface QualityFormReport {
  form: Form;
  completedResponseCount: number;
  respondents: { id: string; fullName: string; answers: Record<QualityMetricKey, number | null> }[];
  metrics: QualityMetricResult[];
}

export interface QualityEvaluationReport {
  forms: QualityFormReport[];
  completedResponseCount: number;
  metrics: QualityMetricResult[];
}

function normalized(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\*/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function buildMetric(
  definition: (typeof QUALITY_METRICS)[number],
  question: Question,
  answers: { questionId: string; value: unknown }[]
): QualityMetricResult {
  const values = answers
    .filter((answer) => answer.questionId === question.id && typeof answer.value === "number")
    .map((answer) => answer.value as number)
    .filter((value) => Number.isInteger(value) && value >= 1 && value <= 5);
  const distribution = [1, 2, 3, 4, 5].map((value) => ({
    value,
    count: values.filter((answer) => answer === value).length,
  }));
  const answeredCount = values.length;
  const favorableCount = values.filter((value) => value >= 4).length;
  return {
    key: definition.key,
    label: definition.label,
    favorableLabel: definition.favorableLabel,
    answeredCount,
    average: answeredCount ? Math.round((values.reduce((sum, value) => sum + value, 0) / answeredCount) * 100) / 100 : null,
    favorableCount,
    favorablePercent: answeredCount ? Math.round((favorableCount / answeredCount) * 1000) / 10 : null,
    distribution,
  };
}

function aggregateMetrics(forms: QualityFormReport[]): QualityMetricResult[] {
  return QUALITY_METRICS.map((definition) => {
    const metrics = forms.map((form) => form.metrics.find((metric) => metric.key === definition.key)!);
    const answeredCount = metrics.reduce((sum, metric) => sum + metric.answeredCount, 0);
    const favorableCount = metrics.reduce((sum, metric) => sum + metric.favorableCount, 0);
    const distribution = [1, 2, 3, 4, 5].map((value) => ({
      value,
      count: metrics.reduce((sum, metric) => sum + metric.distribution.find((entry) => entry.value === value)!.count, 0),
    }));
    const scoreSum = metrics.reduce((sum, metric) => sum + metric.distribution.reduce((subtotal, entry) => subtotal + entry.value * entry.count, 0), 0);
    return {
      key: definition.key,
      label: definition.label,
      favorableLabel: definition.favorableLabel,
      answeredCount,
      average: answeredCount ? Math.round((scoreSum / answeredCount) * 100) / 100 : null,
      favorableCount,
      favorablePercent: answeredCount ? Math.round((favorableCount / answeredCount) * 1000) / 10 : null,
      distribution,
    };
  });
}

export async function getQualityEvaluationReport(
  statsRepo: StatsRepository,
  formRepo: FormRepository,
  input: { formIds: string[]; requestedBy: User; adminAccessToken: string }
): Promise<QualityEvaluationReport> {
  if (input.requestedBy.role !== "admin" && input.requestedBy.role !== "super_admin" && input.requestedBy.role !== "psicologa") throw new ForbiddenError();
  const formIds = [...new Set(input.formIds)];
  if (formIds.length === 0 || formIds.length > 50) {
    throw new InvalidQuestionConfigError("Selecciona entre 1 y 50 formularios.");
  }

  const forms = await Promise.all(formIds.map((formId) => formRepo.getFormById(formId, input.adminAccessToken)));
  if (forms.some((form) => !form)) throw new InvalidQuestionConfigError("Uno de los formularios seleccionados no existe.");
  const selectedForms = forms as Form[];
  if (selectedForms.some((form) => !form.tags.includes(QUALITY_RESTART_TAG))) {
    throw new InvalidQuestionConfigError("Todos los formularios deben tener la etiqueta calidad-restart.");
  }

  const reports = await Promise.all(selectedForms.map(async (form) => {
    const [questions, responses, answers] = await Promise.all([
      formRepo.listQuestionsByForm(form.id, input.adminAccessToken),
      statsRepo.listResponsesByForm(form.id, input.adminAccessToken),
      statsRepo.listAnswersByForm(form.id, input.adminAccessToken),
    ]);
    const metricQuestions = QUALITY_METRICS.map((definition) => {
      const question = questions.find((item) => normalized(item.label) === normalized(definition.question));
      if (!question || question.type !== "likert" || question.config.type !== "likert" || question.config.scaleMin !== 1 || question.config.scaleMax !== 5) {
        throw new InvalidQuestionConfigError(`El formulario “${form.title}” no tiene la estructura de evaluación Restart esperada.`);
      }
      return { definition, question };
    });
    const completedResponseIds = new Set(responses.filter((response) => response.status === "completed").map((response) => response.id));
    const completedAnswers = answers.filter((answer) => completedResponseIds.has(answer.responseId));
    const respondentIds = [...new Set(responses.filter((response) => completedResponseIds.has(response.id)).map((response) => response.participantId))];
    const responseByParticipant = new Map(responses.filter((response) => completedResponseIds.has(response.id)).map((response) => [response.participantId, response]));
    const answerByResponseAndQuestion = new Map(completedAnswers.map((answer) => [`${answer.responseId}:${answer.questionId}`, answer.value]));
    const respondents = (await Promise.all(respondentIds.map(async (id) => {
      const user = await statsRepo.getUserById(id, input.adminAccessToken);
      const response = responseByParticipant.get(id);
      if (!user || !response) return null;
      const answers = Object.fromEntries(metricQuestions.map(({ definition, question }) => {
        const value = answerByResponseAndQuestion.get(`${response.id}:${question.id}`);
        return [definition.key, typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 5 ? value : null];
      })) as Record<QualityMetricKey, number | null>;
      return { id: user.id, fullName: user.fullName, answers };
    }))).filter((user): user is { id: string; fullName: string; answers: Record<QualityMetricKey, number | null> } => user !== null)
      .sort((left, right) => left.fullName.localeCompare(right.fullName, "es-MX", { sensitivity: "base" }));

    return {
      form,
      completedResponseCount: completedResponseIds.size,
      respondents,
      metrics: metricQuestions.map(({ definition, question }) => buildMetric(definition, question, completedAnswers)),
    } satisfies QualityFormReport;
  }));

  return {
    forms: reports,
    completedResponseCount: reports.reduce((sum, report) => sum + report.completedResponseCount, 0),
    metrics: aggregateMetrics(reports),
  };
}
