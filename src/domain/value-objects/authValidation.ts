export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegistrationDetails extends LoginCredentials {
  token: string;
  fullName: string;
}

export interface ValidationResult<T> {
  value: T | null;
  error: string | null;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const MIN_PASSWORD_LENGTH = 8;

function valid<T>(value: T): ValidationResult<T> {
  return { value, error: null };
}

function invalid<T>(error: string): ValidationResult<T> {
  return { value: null, error };
}

export function normalizeEmail(value: unknown): ValidationResult<string> {
  if (typeof value !== "string") return invalid("El correo es obligatorio.");
  const email = value.trim().toLowerCase();
  if (!EMAIL_PATTERN.test(email)) return invalid("El correo no tiene un formato válido.");
  if (email.length > 254) return invalid("El correo es demasiado largo.");
  return valid(email);
}

export function validatePassword(value: unknown): ValidationResult<string> {
  if (typeof value !== "string" || value.length < MIN_PASSWORD_LENGTH) {
    return invalid(`La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`);
  }
  if (value.length > 128) return invalid("La contraseña es demasiado larga.");
  return valid(value);
}

export function validateLoginCredentials(input: {
  email: unknown;
  password: unknown;
}): ValidationResult<LoginCredentials> {
  const email = normalizeEmail(input.email);
  if (email.error) return invalid(email.error);
  if (typeof input.password !== "string" || input.password.length === 0) {
    return invalid("La contraseña es obligatoria.");
  }
  if (input.password.length > 128) return invalid("La contraseña es demasiado larga.");
  return valid({ email: email.value!, password: input.password });
}

export function validateRegistrationDetails(input: {
  token: unknown;
  email: unknown;
  password: unknown;
  fullName: unknown;
}): ValidationResult<RegistrationDetails> {
  if (typeof input.token !== "string" || input.token.trim().length === 0) {
    return invalid("La invitación es obligatoria.");
  }
  const email = normalizeEmail(input.email);
  if (email.error) return invalid(email.error);
  const password = validatePassword(input.password);
  if (password.error) return invalid(password.error);
  if (typeof input.fullName !== "string") return invalid("El nombre completo es obligatorio.");
  const fullName = input.fullName.trim().replace(/\s+/g, " ");
  if (fullName.length < 2 || fullName.length > 120) {
    return invalid("El nombre completo debe tener entre 2 y 120 caracteres.");
  }
  return valid({
    token: input.token.trim(),
    email: email.value!,
    password: password.value!,
    fullName,
  });
}

export function validatePasswordReset(input: {
  tokenHash: unknown;
  newPassword: unknown;
}): ValidationResult<{ tokenHash: string; newPassword: string }> {
  if (typeof input.tokenHash !== "string" || input.tokenHash.trim().length === 0) {
    return invalid("El enlace de recuperación es inválido.");
  }
  const password = validatePassword(input.newPassword);
  if (password.error) return invalid(password.error);
  return valid({ tokenHash: input.tokenHash.trim(), newPassword: password.value! });
}
