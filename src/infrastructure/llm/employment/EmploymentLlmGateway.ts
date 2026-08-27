import { createHash } from "node:crypto";
import { LlmDisabledError } from "@/application/errors";
import { createServerSupabaseClient } from "@/infrastructure/supabase/client";
import type { EmploymentLlmTask } from "./types";

const TTL_HOURS: Record<EmploymentLlmTask, number> = {
  extract_job_keywords: 24 * 30, job_fit_matrix: 24 * 7, draft_cv_summary: 24 * 7, draft_cv_summary_options: 24 * 7, evidence_question: 24 * 7,
  draft_cv_bullet: 24 * 7, cv_coherence_check: 24, outreach_message: 24 * 7, ikigai_synthesis: 24 * 7,
};

/** Orquesta interruptor y caché sin contaminar el engine con Supabase. */
export class EmploymentLlmGateway {
  async run<T>(input: { accessToken: string; userId: string; task: EmploymentLlmTask; promptVersion: string; cacheInput: unknown; execute: () => Promise<T> }): Promise<T> {
    const client = createServerSupabaseClient(input.accessToken);
    const { data: enabled, error: enabledError } = await client.rpc("is_employment_llm_enabled");
    if (enabledError || enabled !== true) throw new LlmDisabledError();
    const model = process.env.MINIMAX_MODEL || "MiniMax-M2.7";
    const cacheKey = createHash("sha256").update(JSON.stringify({ task: input.task, promptVersion: input.promptVersion, model, cacheInput: input.cacheInput })).digest("hex");
    const { data: cached } = await client.from("employment_llm_cache").select("output").eq("cache_key", cacheKey).gt("expires_at", new Date().toISOString()).maybeSingle();
    if (cached?.output) return cached.output as T;
    const output = await input.execute();
    const expiresAt = new Date(Date.now() + TTL_HOURS[input.task] * 3_600_000).toISOString();
    await client.from("employment_llm_cache").upsert({ user_id: input.userId, cache_key: cacheKey, task: input.task, prompt_version: input.promptVersion, model, output, expires_at: expiresAt }, { onConflict: "user_id,cache_key" });
    return output;
  }
}
