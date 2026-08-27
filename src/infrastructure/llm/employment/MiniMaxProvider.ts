import { LlmResponseError } from "@/application/errors";
import type { TextLlmProvider, TextLlmRequest, TextLlmResponse } from "./types";

interface MiniMaxResponse {
  id?: string;
  model?: string;
  choices?: Array<{ message?: { content?: string | null } }>;
  base_resp?: { status_code?: number; status_msg?: string };
}

/** Adaptador HTTP: no conoce el dominio de empleabilidad ni reglas de negocio. */
export class MiniMaxProvider implements TextLlmProvider {
  async complete(request: TextLlmRequest): Promise<TextLlmResponse> {
    const apiKey = process.env.MINIMAX_API_KEY;
    if (!apiKey) throw new LlmResponseError("MINIMAX_API_KEY no está configurada.");
    const model = process.env.MINIMAX_MODEL || "MiniMax-M2.7";
    const response = await fetch("https://api.minimax.io/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [{ role: "system", content: request.system }, { role: "user", content: request.user }],
        temperature: request.temperature,
        max_completion_tokens: request.maxCompletionTokens,
        stream: false,
        reasoning_split: true,
      }),
      // 90s, no 30s: la matriz de ajuste (hasta 20 filas) puede tardar 40s+ con
      // un modelo de razonamiento — un timeout corto la cortaba a mitad de
      // generación antes de que el texto llegara truncado.
      signal: AbortSignal.timeout(90_000),
    });
    if (!response.ok) throw new LlmResponseError(`MiniMax respondió ${response.status}.`);
    const data = await response.json() as MiniMaxResponse;
    if (data.base_resp?.status_code && data.base_resp.status_code !== 0) throw new LlmResponseError(data.base_resp.status_msg || "MiniMax rechazó la solicitud.");
    const text = data.choices?.[0]?.message?.content?.trim();
    if (!text) throw new LlmResponseError("MiniMax no devolvió contenido.");
    return { text, model: data.model || model, requestId: data.id || null };
  }
}
