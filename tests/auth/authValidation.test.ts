import assert from "node:assert/strict";
import test from "node:test";
import {
  MIN_PASSWORD_LENGTH,
  normalizeEmail,
  validateLoginCredentials,
  validatePasswordReset,
  validateRegistrationDetails,
} from "../../src/domain/value-objects/authValidation.ts";

test("normaliza el correo antes de autenticar", () => {
  assert.deepEqual(normalizeEmail("  PERSONA@Ejemplo.COM "), {
    value: "persona@ejemplo.com",
    error: null,
  });
});

test("rechaza credenciales incompletas sin llegar al proveedor", () => {
  assert.match(validateLoginCredentials({ email: "invalido", password: "" }).error!, /correo/i);
  assert.match(
    validateLoginCredentials({ email: "persona@ejemplo.com", password: "" }).error!,
    /contraseña/i
  );
});

test("normaliza registro y conserva la contraseña literalmente", () => {
  const result = validateRegistrationDetails({
    token: "  invite-token  ",
    email: " PERSONA@EJEMPLO.COM ",
    password: " una contraseña segura ",
    fullName: "  Ana   Pérez  ",
  });
  assert.deepEqual(result, {
    value: {
      token: "invite-token",
      email: "persona@ejemplo.com",
      password: " una contraseña segura ",
      fullName: "Ana Pérez",
    },
    error: null,
  });
});

test("aplica una política mínima de contraseña en registro y recuperación", () => {
  const weakPassword = "x".repeat(MIN_PASSWORD_LENGTH - 1);
  assert.match(
    validateRegistrationDetails({
      token: "token",
      email: "persona@ejemplo.com",
      password: weakPassword,
      fullName: "Ana Pérez",
    }).error!,
    /al menos 8/i
  );
  assert.match(
    validatePasswordReset({ tokenHash: "token", newPassword: weakPassword }).error!,
    /al menos 8/i
  );
});

test("rechaza recuperación sin token", () => {
  assert.match(
    validatePasswordReset({ tokenHash: "", newPassword: "password-seguro" }).error!,
    /enlace/i
  );
});
