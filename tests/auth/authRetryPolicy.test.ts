import assert from "node:assert/strict";
import test from "node:test";
import { shouldAttemptSessionRefresh } from "../../src/presentation/services/authRetryPolicy.ts";

test("refresca una solicitud protegida que recibe 401", () => {
  assert.equal(
    shouldAttemptSessionRefresh({ url: "/forms", status: 401, alreadyRetried: false }),
    true
  );
});

test("no refresca login, registro, recuperación ni el propio refresh", () => {
  for (const url of [
    "/auth/login",
    "/auth/register",
    "/auth/forgot-password",
    "/auth/reset-password",
    "/auth/refresh",
  ]) {
    assert.equal(shouldAttemptSessionRefresh({ url, status: 401 }), false, url);
  }
});

test("no crea loops ni refresca errores ajenos a autenticación", () => {
  assert.equal(shouldAttemptSessionRefresh({ url: "/forms", status: 500 }), false);
  assert.equal(
    shouldAttemptSessionRefresh({ url: "/forms", status: 401, alreadyRetried: true }),
    false
  );
});
