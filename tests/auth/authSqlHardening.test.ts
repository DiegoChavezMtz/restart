import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationUrl = new URL("../../supabase/sql/013_auth_hardening.sql", import.meta.url);

test("la migración deriva la cohorte de la invitación y fija el rol", async () => {
  const sql = await readFile(migrationUrl, "utf8");
  assert.match(sql, /invitation_token/);
  assert.match(sql, /i\.is_active = true/);
  assert.match(sql, /'participant'/);
  assert.doesNotMatch(sql, /raw_user_meta_data\s*->>\s*'role'/);
  assert.doesNotMatch(sql, /raw_user_meta_data\s*->>\s*'cohort_id'/);
});

test("la migración protege rol y cohorte en actualizaciones propias", async () => {
  const sql = await readFile(migrationUrl, "utf8");
  assert.match(sql, /new\.role is distinct from old\.role/);
  assert.match(sql, /new\.cohort_id is distinct from old\.cohort_id/);
  assert.match(sql, /protect_user_security_fields/);
});

test("la migración elimina la inserción directa de perfiles propios", async () => {
  const sql = await readFile(migrationUrl, "utf8");
  assert.match(sql, /drop policy if exists "users_insert_own"/);
  assert.doesNotMatch(sql, /create policy "users_insert_own"/);
});
