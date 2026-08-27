import { LlmResponseError } from "@/application/errors";
import { MiniMaxProvider } from "./MiniMaxProvider";
import { EMPLOYMENT_SYSTEM_PROMPT } from "./prompt-core/common";
import { cvCoherenceCheckPrompt, draftCvBulletPrompt, draftCvSummaryOptionsPrompt, draftCvSummaryPrompt, evidenceQuestionPrompt, extractJobKeywordsPrompt, ikigaiSynthesisPrompt, jobFitMatrixPrompt, outreachMessagePrompt } from "./prompt-core/employmentPrompts";
import type { CoherenceCheck, DraftBullet, DraftSummary, DraftSummaryOptions, EvidenceQuestion, ExtractedKeyword, IkigaiSynthesis, JobFitMatrixItem, OutreachMessage, TextLlmProvider } from "./types";

function parseJson(text: string): unknown {
  const withoutThinking = text.replace(/<think>[\s\S]*?<\/think>\s*/g, "").trim();
  const candidate = withoutThinking.replace(/^```json\s*|^```|```$/g, "").trim();
  try { return JSON.parse(candidate); } catch { throw new LlmResponseError("La IA devolvió una respuesta con formato inválido."); }
}
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new LlmResponseError("La IA devolvió una estructura inválida.");
  return value as Record<string, unknown>;
}
function text(value: unknown, field: string, max = 3_000): string {
  if (typeof value !== "string" || !value.trim() || value.length > max) throw new LlmResponseError(`La IA devolvió ${field} inválido.`);
  return value.trim();
}

/** Núcleo agnóstico: únicamente produce y valida contenido; no persiste dominio. */
export class EmploymentLlmEngine {
  constructor(private readonly provider: TextLlmProvider = new MiniMaxProvider()) {}
  private async json(prompt: string, maxCompletionTokens = 700): Promise<Record<string, unknown>> {
    const result = await this.provider.complete({ system: EMPLOYMENT_SYSTEM_PROMPT, user: prompt, temperature: 0.2, maxCompletionTokens });
    return object(parseJson(result.text));
  }
  async extractJobKeywords(jobText: string): Promise<{ keywords: ExtractedKeyword[]; companyName: string | null; roleTitle: string | null }> {
    const result = await this.json(extractJobKeywordsPrompt(jobText)); const values = result.keywords;
    if (!Array.isArray(values) || values.length < 1 || values.length > 18) throw new LlmResponseError("La IA no devolvió keywords válidas.");
    const keywords: ExtractedKeyword[] = values.map((item) => { const row = object(item); const relevance = row.relevance; if (relevance !== "high" && relevance !== "medium" && relevance !== "low") throw new LlmResponseError(); return { keyword: text(row.keyword, "keyword", 120), relevance: relevance as ExtractedKeyword["relevance"] }; });
    return { keywords, companyName: typeof result.companyName === "string" ? result.companyName.trim() || null : null, roleTitle: typeof result.roleTitle === "string" ? result.roleTitle.trim() || null : null };
  }
  async buildJobFitMatrix(input: unknown): Promise<JobFitMatrixItem[]> { const r = await this.json(jobFitMatrixPrompt(input), 3_000); if (!Array.isArray(r.items) || r.items.length > 20) throw new LlmResponseError("La IA no devolvió una matriz de ajuste válida."); return r.items.map((value) => { const row = object(value); const priority = row.priority; const status = row.status; if (!["indispensable", "important", "desirable"].includes(String(priority)) || !["demonstrated", "partial", "not_demonstrated"].includes(String(status)) || !Array.isArray(row.evidenceRefs)) throw new LlmResponseError("La IA devolvió una fila de ajuste inválida."); return { requirement: text(row.requirement, "requirement", 240), priority: priority as JobFitMatrixItem["priority"], status: status as JobFitMatrixItem["status"], evidenceRefs: row.evidenceRefs.filter((id): id is string => typeof id === "string").slice(0, 5), suggestion: text(row.suggestion, "suggestion", 500) }; }); }
  async askEvidenceQuestion(claim: string): Promise<EvidenceQuestion> { const r = await this.json(evidenceQuestionPrompt(claim)); if (!Array.isArray(r.questions) || r.questions.length < 1 || r.questions.length > 2) throw new LlmResponseError(); return { questions: r.questions.map((q) => text(q, "question", 400)) }; }
  async draftCvBullet(input: unknown): Promise<DraftBullet> { const r = await this.json(draftCvBulletPrompt(input), 1_200); if (typeof r.qualitativeOnly !== "boolean" || !Array.isArray(r.alternatives) || r.alternatives.length < 2 || r.alternatives.length > 3) throw new LlmResponseError(); return { alternatives: r.alternatives.map((value) => text(value, "alternative", 400)), qualitativeOnly: r.qualitativeOnly }; }
  async draftCvSummary(input: unknown): Promise<DraftSummary> { const r = await this.json(draftCvSummaryPrompt(input)); return { headline: text(r.headline, "headline", 160), summary: text(r.summary, "summary", 900) }; }
  async draftCvSummaryOptions(input: unknown): Promise<DraftSummaryOptions> { const r = await this.json(draftCvSummaryOptionsPrompt(input), 1_800); if (!Array.isArray(r.alternatives) || r.alternatives.length !== 3) throw new LlmResponseError("La IA no devolvió tres alternativas de resumen."); return { alternatives: r.alternatives.map((value) => { const row = object(value); return { headline: text(row.headline, "headline", 160), summary: text(row.summary, "summary", 900) }; }) }; }
  async checkCvCoherence(input: unknown): Promise<CoherenceCheck> { const r = await this.json(cvCoherenceCheckPrompt(input), 1_200); if (!Array.isArray(r.notes)) throw new LlmResponseError(); return { notes: r.notes.slice(0, 5).map((n) => text(n, "note", 400)) }; }
  async draftOutreachMessage(input: unknown): Promise<OutreachMessage> { const r = await this.json(outreachMessagePrompt(input)); return { message: text(r.message, "message", 1_500) }; }
  async synthesizeIkigai(input: unknown): Promise<IkigaiSynthesis> { const r = await this.json(ikigaiSynthesisPrompt(input)); return { synthesis: text(r.synthesis, "synthesis", 1_200) }; }
}
