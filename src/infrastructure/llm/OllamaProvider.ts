const DEFAULT_BASE_URL = "http://localhost:11434";
const DEFAULT_MODEL = "llama3.2:3b";

interface OllamaGenerateResponse {
  response: string;
}

// Llamada cruda a un servidor Ollama local — lanza si el servidor no
// responde o si el modelo no está disponible. El manejo de fallback vive en
// LlmInterpreter.ts, no aquí.
export async function callOllama(prompt: string): Promise<string> {
  const baseUrl = process.env.OLLAMA_BASE_URL || DEFAULT_BASE_URL;
  const model = process.env.OLLAMA_MODEL || DEFAULT_MODEL;

  const response = await fetch(`${baseUrl}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, prompt, stream: false }),
  });

  if (!response.ok) {
    throw new Error(`Ollama respondió ${response.status}: ${await response.text()}`);
  }

  const data = (await response.json()) as OllamaGenerateResponse;
  return data.response.trim();
}
