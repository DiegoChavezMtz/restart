import { callGemini } from "./GeminiProvider";
import { callOllama } from "./OllamaProvider";
import {
  buildGlobalInterpretationPrompt,
  type GlobalInterpretationPromptInput,
} from "./prompt-core/globalInterpretationPrompt";
import {
  buildIndividualInterpretationPrompt,
  type IndividualInterpretationPromptInput,
} from "./prompt-core/individualInterpretationPrompt";

const ERROR_MESSAGE = "No fue posible generar la interpretación en este momento.";

// LLM_PROVIDER selecciona qué backend interpreta los resultados:
// "gemini" (default) usa la API de Gemini vía GEMINI_API_KEY;
// "ollama" usa un servidor Ollama local (OLLAMA_BASE_URL/OLLAMA_MODEL), sin API key.
async function callLlm(prompt: string): Promise<string> {
  const provider = (process.env.LLM_PROVIDER || "gemini").toLowerCase();

  try {
    const text = provider === "ollama" ? await callOllama(prompt) : await callGemini(prompt);
    return text || ERROR_MESSAGE;
  } catch (error) {
    console.error(`LLM request failed (provider=${provider})`, error);
    return ERROR_MESSAGE;
  }
}

export function generateGlobalInterpretation(
  input: GlobalInterpretationPromptInput
): Promise<string> { 
  return callLlm(buildGlobalInterpretationPrompt(input));
}

export function generateIndividualInterpretation(
  input: IndividualInterpretationPromptInput
): Promise<string> {
  return callLlm(buildIndividualInterpretationPrompt(input));
}
