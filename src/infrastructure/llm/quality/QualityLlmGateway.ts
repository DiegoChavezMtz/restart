import { createServerSupabaseClient } from "@/infrastructure/supabase/client";
import { MiniMaxProvider } from "@/infrastructure/llm/employment/MiniMaxProvider";
import { buildQualityInterpretationPrompt } from "@/infrastructure/llm/prompt-core/qualityInterpretationPrompt";
import type { QualityEvaluationReport } from "@/application/use-cases/quality/GetQualityEvaluationReport";

/** Bloquea la salida antes de construir una llamada a MiniMax. */
export async function generateQualityInterpretationWithMiniMax(
  report: QualityEvaluationReport,
  accessToken: string
): Promise<string | null> {
  const client = createServerSupabaseClient(accessToken);
  const { data: enabled, error } = await client.rpc("is_quality_llm_enabled");
  if (error || enabled !== true) return null;

  const response = await new MiniMaxProvider().complete({
    system: "Eres un analista de Calidad e Investigación. Responde solo con el análisis solicitado y no inventes datos.",
    user: buildQualityInterpretationPrompt(report),
    temperature: 0.2,
    maxCompletionTokens: 900,
  });
  return response.text;
}
