-- =============================================================================
-- 042_employment_cv_versions.sql  —  Módulo de empleabilidad: versiones de CV
-- =============================================================================
-- Idempotente. Correr manualmente en el SQL Editor DESPUÉS de
-- 041_employment_job_targets.sql. Ver docs/MODULO_EMPLEO.md para el diseño
-- completo.
--
-- content es JSONB completo (contacto, resumen, experiencia con bullets,
-- educación, skills) — NO se normaliza en tablas por bullet. Mismo patrón que
-- answers.value/QuestionConfig ya usado en el resto del proyecto. Razón: cada
-- versión debe quedar congelada tal cual se generó; si luego se edita una
-- experience_entry, las versiones de CV ya generadas no deben cambiar.
-- =============================================================================


create table if not exists public.cv_versions (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.users (id) on delete cascade,
  job_target_id  uuid not null references public.job_targets (id) on delete restrict,
  title          text not null,
  status         text not null default 'draft'
                   check (status in ('draft', 'quality_review', 'approved', 'sent')),
  content        jsonb not null,
  quality_check  jsonb,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists idx_cv_versions_user_id on public.cv_versions (user_id);
create index if not exists idx_cv_versions_job_target_id on public.cv_versions (job_target_id);


-- RLS ---------------------------------------------------------------------------
alter table public.cv_versions enable row level security;

grant select, insert, update, delete on public.cv_versions to authenticated;

drop policy if exists cv_versions_owner_all on public.cv_versions;
create policy cv_versions_owner_all
  on public.cv_versions for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());


-- =============================================================================
-- Verificar tras correr:
--   select tablename, policyname from pg_policies where tablename = 'cv_versions';
-- =============================================================================
