import assert from "node:assert/strict";
import test from "node:test";
import { getRoleHome, getSafeNextPath } from "../../src/presentation/services/authNavigation.ts";

test("dirige cada rol a su área", () => {
  assert.equal(getRoleHome("admin"), "/admin");
  assert.equal(getRoleHome("participant"), "/respond");
});

test("acepta únicamente destinos internos", () => {
  assert.equal(getSafeNextPath("/respond/form-1?resume=true"), "/respond/form-1?resume=true");
  assert.equal(getSafeNextPath("https://evil.example"), null);
  assert.equal(getSafeNextPath("//evil.example/path"), null);
  assert.equal(getSafeNextPath(null), null);
});
