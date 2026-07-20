import type { NextRequest } from "next/server";
import { InvalidAuthInputError } from "@/application/errors";

export async function readJsonObject(request: NextRequest): Promise<Record<string, unknown>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new InvalidAuthInputError("El cuerpo de la solicitud no contiene JSON válido.");
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new InvalidAuthInputError("El cuerpo de la solicitud debe ser un objeto.");
  }
  return body as Record<string, unknown>;
}
