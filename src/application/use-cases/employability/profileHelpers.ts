import { ForbiddenError, UseCaseError } from "@/application/errors";
import type { User } from "@/domain/entities";

export function assertEmploymentUser(user: User): void {
  if (user.role !== "usuario" && user.role !== "test") throw new ForbiddenError();
}

export function optionalText(value: unknown, field: string, maxLength = 5_000): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string") throw new UseCaseError(`${field} debe ser texto.`, 400);
  const text = value.trim();
  if (text.length > maxLength) throw new UseCaseError(`${field} no puede exceder ${maxLength} caracteres.`, 400);
  return text;
}

export function requiredText(value: unknown, field: string, maxLength = 5_000): string {
  const text = optionalText(value, field, maxLength);
  if (!text) throw new UseCaseError(`${field} es obligatorio.`, 400);
  return text;
}

// Como optionalText, pero además acepta `null` explícito (limpiar el campo)
// sin lanzar — a diferencia de optionalText, que solo trata `undefined`
// (campo no enviado) como "sin valor".
export function optionalNullableText(value: unknown, field: string, maxLength = 5_000): string | null | undefined {
  if (value === null) return null;
  return optionalText(value, field, maxLength);
}

export function optionalBoolean(value: unknown, field: string): boolean | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "boolean") throw new UseCaseError(`${field} debe ser booleano.`, 400);
  return value;
}

// Exige nombre y apellido (al menos dos palabras) — no valida ortografía,
// solo descarta el caso "nombre incompleto" que motivó el gate de perfil.
export function isFullNameComplete(fullName: string): boolean {
  const trimmed = fullName.trim().replace(/\s+/g, " ");
  return trimmed.length >= 4 && trimmed.includes(" ");
}

const PHONE_PATTERN = /^[+()\d\s-]{7,20}$/;

export function isValidPhone(phone: string): boolean {
  return PHONE_PATTERN.test(phone.trim());
}
