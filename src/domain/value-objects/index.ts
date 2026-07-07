// See docs/CONSTITUCION.md section 4 y regla 6 (registry pattern).
// Agregar un tipo nuevo implica: 1 entrada aquí, su variante en QuestionConfig,
// y su componente en presentation/registries/questionTypeRegistry.tsx.

export type QuestionType = "likert" | "open_text" | "single_choice" | "checkbox";

export type QuestionConfig =
  | { type: "likert"; scaleMin: number; scaleMax: number; labels?: string[] }
  | { type: "open_text"; maxLength?: number }
  | { type: "single_choice"; options: string[] }
  | { type: "checkbox"; options: string[]; minSelections?: number };

/**
 * Pure, framework-free validation — reused by both the client-side
 * ConfigEditor components and the server-side use cases, so validation
 * never forks between client and server.
 */
export function validateQuestionConfig(config: QuestionConfig): string | null {
  switch (config.type) {
    case "likert": {
      if (!Number.isInteger(config.scaleMin) || !Number.isInteger(config.scaleMax)) {
        return "scaleMin y scaleMax deben ser enteros.";
      }
      if (config.scaleMin >= config.scaleMax) return "scaleMin debe ser menor que scaleMax.";
      if (config.scaleMax - config.scaleMin > 20) return "El rango de la escala es demasiado amplio.";
      if (
        config.labels &&
        config.labels.length > 0 &&
        config.labels.length !== config.scaleMax - config.scaleMin + 1
      ) {
        return "labels debe tener exactamente un valor por punto de la escala.";
      }
      return null;
    }
    case "open_text": {
      if (
        config.maxLength !== undefined &&
        (!Number.isInteger(config.maxLength) || config.maxLength < 1 || config.maxLength > 5000)
      ) {
        return "maxLength debe ser un entero entre 1 y 5000.";
      }
      return null;
    }
    case "single_choice":
    case "checkbox": {
      const trimmed = config.options.map((o) => o.trim());
      if (trimmed.length < 2) return "Debe haber al menos 2 opciones.";
      if (trimmed.some((o) => o.length === 0)) return "Ninguna opción puede estar vacía.";
      if (new Set(trimmed).size !== trimmed.length) return "No puede haber opciones duplicadas.";
      if (config.type === "checkbox" && config.minSelections !== undefined) {
        if (
          !Number.isInteger(config.minSelections) ||
          config.minSelections < 1 ||
          config.minSelections > trimmed.length
        ) {
          return "minSelections debe estar entre 1 y la cantidad de opciones.";
        }
      }
      return null;
    }
  }
}

/**
 * Pure validation for QuestionSkillWeight.weight (entero 1-5). The
 * "solo permitido si question.type === 'likert'" rule needs the actual
 * Question entity and lives in the use case instead, to keep value-objects
 * entity-free.
 */
export function validateQuestionSkillWeight(weight: number): string | null {
  if (!Number.isInteger(weight) || weight < 1 || weight > 5) {
    return "weight debe ser un entero entre 1 y 5.";
  }
  return null;
}

// JSONB, shape según QuestionType (docs/CONSTITUCION.md section 4):
// likert -> number, open_text -> string, single_choice -> string, checkbox -> string[].
export type AnswerValue = number | string | string[];

/**
 * Pure validation for Answer.value against the question's config — same
 * reused-by-client-and-server pattern as validateQuestionConfig.
 */
export function validateAnswerValue(config: QuestionConfig, value: AnswerValue): string | null {
  switch (config.type) {
    case "likert": {
      if (typeof value !== "number" || !Number.isInteger(value)) {
        return "La respuesta debe ser un número entero.";
      }
      if (value < config.scaleMin || value > config.scaleMax) {
        return `La respuesta debe estar entre ${config.scaleMin} y ${config.scaleMax}.`;
      }
      return null;
    }
    case "open_text": {
      if (typeof value !== "string") return "La respuesta debe ser texto.";
      if (config.maxLength !== undefined && value.length > config.maxLength) {
        return `La respuesta no puede superar ${config.maxLength} caracteres.`;
      }
      return null;
    }
    case "single_choice": {
      if (typeof value !== "string") return "La respuesta debe ser una opción.";
      if (!config.options.includes(value)) return "La opción seleccionada no es válida.";
      return null;
    }
    case "checkbox": {
      if (!Array.isArray(value) || value.some((v) => typeof v !== "string")) {
        return "La respuesta debe ser una lista de opciones.";
      }
      if (value.some((v) => !config.options.includes(v))) {
        return "Alguna opción seleccionada no es válida.";
      }
      if (config.minSelections !== undefined && value.length < config.minSelections) {
        return `Debes seleccionar al menos ${config.minSelections} opciones.`;
      }
      return null;
    }
  }
}
