-- =============================================================================
-- 041_employment_job_targets.sql  —  Módulo de empleabilidad: vacantes y keywords
-- =============================================================================
-- Idempotente. Correr manualmente en el SQL Editor DESPUÉS de
-- 040_employment_evidence.sql. Ver docs/MODULO_EMPLEO.md para el diseño completo.
--
-- job_targets guarda el texto crudo que el usuario pega de una vacante real.
-- job_keywords son las palabras clave que la IA extrae de ESE texto — nunca
-- se generan vacantes ni keywords sin un job_target de origen.
-- =============================================================================


-- 1. Vacantes -------------------------------------------------------------------
create table if not exists public.job_targets (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.users (id) on delete cascade,
  source_site   text not null check (source_site in ('linkedin', 'indeed', 'occ', 'otro')),
  raw_text      text not null,
  company_name  text,
  role_title    text,
  created_at    timestamptz not null default now()
);
create index if not exists idx_job_targets_user_id on public.job_targets (user_id);


-- 2. Keywords ---------------------------------------------------------------------
create table if not exists public.job_keywords (
  id                   uuid primary key default gen_random_uuid(),
  job_target_id        uuid not null references public.job_targets (id) on delete cascade,
  keyword              text not null,
  relevance            text not null check (relevance in ('high', 'medium', 'low')),
  matched_in_profile   boolean not null default false
);
create index if not exists idx_job_keywords_job_target_id on public.job_keywords (job_target_id);


-- 3. RLS ----------------------------------------------------------------------
alter table public.job_targets  enable row level security;
alter table public.job_keywords enable row level security;

grant select, insert, update, delete on public.job_targets  to authenticated;
grant select, insert, update, delete on public.job_keywords to authenticated;

drop policy if exists job_targets_owner_all on public.job_targets;
create policy job_targets_owner_all
  on public.job_targets for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists job_keywords_owner_all on public.job_keywords;
create policy job_keywords_owner_all
  on public.job_keywords for all to authenticated
  using (exists (
    select 1 from public.job_targets t
    where t.id = job_target_id and t.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.job_targets t
    where t.id = job_target_id and t.user_id = auth.uid()
  ));


-- =============================================================================
-- Verificar tras correr:
--   select tablename, policyname from pg_policies where tablename in ('job_targets','job_keywords');
-- =============================================================================
