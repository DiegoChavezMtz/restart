-- =============================================================================
-- 040_employment_evidence.sql  —  Módulo de empleabilidad: evidencia de logros
-- =============================================================================
-- Idempotente. Correr manualmente en el SQL Editor DESPUÉS de
-- 039_employment_profile.sql. Ver docs/MODULO_EMPLEO.md para el diseño completo.
--
-- Esta tabla es el gate real anti-cifras-inventadas: un bullet de CV solo
-- puede citar una cifra si existe una fila aquí con metric_confirmed_by_user
-- = true ligada a él. La aplicación valida esto en el caso de uso que guarda
-- el bullet — esta tabla es el dato de soporte, no el enforcement en sí.
-- =============================================================================


create table if not exists public.achievement_evidence (
  id                        uuid primary key default gen_random_uuid(),
  experience_entry_id       uuid not null references public.experience_entries (id) on delete cascade,
  claim                     text not null,
  metric_value              text,
  metric_confirmed_by_user  boolean not null default false,
  created_at                timestamptz not null default now()
);
create index if not exists idx_achievement_evidence_experience_entry_id
  on public.achievement_evidence (experience_entry_id);


-- RLS ---------------------------------------------------------------------------
alter table public.achievement_evidence enable row level security;

grant select, insert, update, delete on public.achievement_evidence to authenticated;

drop policy if exists achievement_evidence_owner_all on public.achievement_evidence;
create policy achievement_evidence_owner_all
  on public.achievement_evidence for all to authenticated
  using (exists (
    select 1
    from public.experience_entries e
    join public.employment_profiles p on p.id = e.profile_id
    where e.id = experience_entry_id and p.user_id = auth.uid()
  ))
  with check (exists (
    select 1
    from public.experience_entries e
    join public.employment_profiles p on p.id = e.profile_id
    where e.id = experience_entry_id and p.user_id = auth.uid()
  ));


-- =============================================================================
-- Verificar tras correr:
--   select tablename, policyname from pg_policies where tablename = 'achievement_evidence';
-- =============================================================================
