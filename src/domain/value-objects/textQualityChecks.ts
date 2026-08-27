// Chequeo determinístico, no-IA, de errores de redacción comunes en el
// contenido de un CV. Deliberadamente NO es un corrector ortográfico
// exhaustivo (no hay diccionario) — detecta patrones concretos y explicables:
// espacios dobles, palabras repetidas consecutivas, y oraciones que no
// inician con mayúscula. Se ejecuta en código, nunca vía LLM (ver
// docs/MODULO_EMPLEO.md — la coherencia sí la revisa la IA, la ortografía no,
// para no depender de que el modelo audite su propia redacción).

export interface SpellingCheckResult {
  ok: boolean;
  issues: string[];
}

const DOUBLE_SPACE = / {2,}/;
const REPEATED_WORD = /\b(\p{L}+)\s+\1\b/giu;
const SENTENCE_SPLIT = /(?<=[.!?])\s+/;
const MAX_ISSUES = 10;

function truncate(value: string, max = 70): string {
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

function isLowercaseLetter(char: string): boolean {
  return char.toLowerCase() === char && char.toUpperCase() !== char;
}

export function checkSpelling(texts: string[]): SpellingCheckResult {
  const issues: string[] = [];

  for (const raw of texts) {
    const value = raw.trim();
    if (!value) continue;

    if (DOUBLE_SPACE.test(value)) {
      issues.push(`Espacios dobles en: "${truncate(value)}"`);
    }

    REPEATED_WORD.lastIndex = 0;
    if (REPEATED_WORD.test(value)) {
      issues.push(`Palabra repetida en: "${truncate(value)}"`);
    }

    for (const sentence of value.split(SENTENCE_SPLIT)) {
      const trimmedSentence = sentence.trim();
      const firstChar = trimmedSentence[0];
      if (firstChar && isLowercaseLetter(firstChar)) {
        issues.push(`Inicia con minúscula: "${truncate(trimmedSentence)}"`);
      }
    }
  }

  return { ok: issues.length === 0, issues: issues.slice(0, MAX_ISSUES) };
}
