import { InvalidQuestionConfigError } from "@/application/errors";
import { validateQuestionConfig, type QuestionConfig, type QuestionType } from "@/domain/value-objects";

type JsonObject = Record<string, unknown>;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const QUESTION_TYPES: QuestionType[] = ["likert", "open_text", "single_choice", "checkbox"];

function invalid(message: string): never {
  throw new InvalidQuestionConfigError(message);
}

export function requiredString(body: JsonObject, field: string): string {
  const value = body[field];
  if (typeof value !== "string") invalid(`${field} debe ser texto.`);
  return value;
}

export function optionalString(body: JsonObject, field: string): string | null | undefined {
  const value = body[field];
  if (value === undefined) return undefined;
  if (value === null || typeof value === "string") return value;
  invalid(`${field} debe ser texto o null.`);
}

export function requiredBoolean(body: JsonObject, field: string): boolean {
  const value = body[field];
  if (typeof value !== "boolean") invalid(`${field} debe ser booleano.`);
  return value;
}

export function optionalBoolean(body: JsonObject, field: string): boolean | undefined {
  const value = body[field];
  if (value === undefined) return undefined;
  if (typeof value !== "boolean") invalid(`${field} debe ser booleano.`);
  return value;
}

export function optionalTimeLimit(body: JsonObject): number | null | undefined {
  const value = body.timeLimitSeconds;
  if (value === undefined || value === null) return value;
  if (!Number.isInteger(value) || (value as number) < 5) {
    invalid("timeLimitSeconds debe ser null o un entero >= 5.");
  }
  return value as number;
}

export function parseQuestionType(value: unknown): QuestionType {
  if (typeof value !== "string" || !QUESTION_TYPES.includes(value as QuestionType)) {
    invalid("type de pregunta no es válido.");
  }
  return value as QuestionType;
}

export function parseQuestionConfig(value: unknown): QuestionConfig {
  if (!value || typeof value !== "object" || Array.isArray(value)) invalid("config debe ser un objeto.");
  const config = value as Record<string, unknown>;
  const type = parseQuestionType(config.type);
  let parsed: QuestionConfig;
  if (type === "likert") {
    if (!Number.isInteger(config.scaleMin) || !Number.isInteger(config.scaleMax)
      || (config.labels !== undefined && (!Array.isArray(config.labels) || !config.labels.every((x) => typeof x === "string")))) {
      invalid("La configuración Likert no es válida.");
    }
    parsed = { type, scaleMin: config.scaleMin as number, scaleMax: config.scaleMax as number, labels: config.labels as string[] | undefined };
  } else if (type === "open_text") {
    if (config.maxLength !== undefined && !Number.isInteger(config.maxLength)) invalid("maxLength debe ser entero.");
    parsed = { type, maxLength: config.maxLength as number | undefined };
  } else {
    if (!Array.isArray(config.options) || !config.options.every((x) => typeof x === "string")) {
      invalid("options debe ser una lista de textos.");
    }
    if (type === "checkbox") {
      if (config.minSelections !== undefined && !Number.isInteger(config.minSelections)) invalid("minSelections debe ser entero.");
      parsed = { type, options: config.options, minSelections: config.minSelections as number | undefined };
    } else {
      parsed = { type, options: config.options };
    }
  }
  const error = validateQuestionConfig(parsed);
  if (error) invalid(error);
  return parsed;
}

export function assertUuid(value: unknown, field: string): string {
  if (typeof value !== "string" || !UUID.test(value)) invalid(`${field} debe ser un UUID válido.`);
  return value;
}

export function parseTargets(value: unknown): { targetType: "user" | "cohort"; targetId: string }[] {
  if (!Array.isArray(value)) invalid("targets debe ser una lista.");
  return value.map((target) => {
    if (!target || typeof target !== "object" || Array.isArray(target)) invalid("Cada target debe ser un objeto.");
    const item = target as JsonObject;
    if (item.targetType !== "user" && item.targetType !== "cohort") invalid("targetType no es válido.");
    return { targetType: item.targetType, targetId: assertUuid(item.targetId, "targetId") };
  });
}

export function parseBranches(value: unknown): { optionValue: string; targetQuestionId: string | null; endsForm: boolean }[] {
  if (!Array.isArray(value)) invalid("branches debe ser una lista.");
  return value.map((branch) => {
    if (!branch || typeof branch !== "object" || Array.isArray(branch)) invalid("Cada salto debe ser un objeto.");
    const item = branch as JsonObject;
    const targetQuestionId = item.targetQuestionId === null ? null : assertUuid(item.targetQuestionId, "targetQuestionId");
    return {
      optionValue: requiredString(item, "optionValue"),
      targetQuestionId,
      endsForm: requiredBoolean(item, "endsForm"),
    };
  });
}

export function parseAnswerValue(value: unknown): number | string | string[] | null {
  if (value === null) return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") return value;
  if (Array.isArray(value) && value.every((item) => typeof item === "string")) return value;
  invalid("value debe ser un número, texto, lista de textos o null.");
}
