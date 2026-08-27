-- =============================================================================
-- 046_user_profiles.sql — Datos de contacto (gate de perfil completo)
-- =============================================================================
-- Idempotente. Correr manualmente en el SQL Editor DESPUÉS de
-- 045_employment_llm_control.sql. Ver docs/MODULO_EMPLEO.md.
--
-- Esta tabla es de PLATAFORMA, no exclusiva del módulo de empleo: guarda los
-- datos de contacto (teléfono, ubicación, LinkedIn) que hoy no existen en
-- ningún lado del esquema. Es la fuente canónica que:
--   1. Usa el gate de "perfil completo" para permitir la entrada a /employment.
--   2. Debe consultar generateCvDraft (EmploymentAiActions.ts) en vez de dejar
--      phone/location vacíos como hace hoy.
--
-- El nombre completo (full_name) NO vive aquí — si el usuario lo corrige, se
-- actualiza directo en public.users.full_name (el RLS y el trigger de
-- endurecimiento de auth ya lo permiten; solo protegen role/cohort_id).
-- =============================================================================


create table if not exists public.user_profiles (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null unique references public.users (id) on delete cascade,
  phone         text not null default '',
  location      text not null default '',
  linkedin_url  text,
  updated_at    timestamptz not null default now()
);
-- UNIQUE (user_id) ya cubre el lookup "mi perfil de contacto" — no requiere
-- índice adicional, mismo patrón que ikigai_profiles/employment_profiles.


-- RLS ---------------------------------------------------------------------------
alter table public.user_profiles enable row level security;

grant select, insert, update, delete on public.user_profiles to authenticated;

drop policy if exists user_profiles_owner_all on public.user_profiles;
create policy user_profiles_owner_all
  on public.user_profiles for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());


-- =============================================================================
-- Verificar tras correr:
--   select tablename, policyname from pg_policies where tablename = 'user_profiles';
-- =============================================================================
