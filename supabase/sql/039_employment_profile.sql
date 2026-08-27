-- =============================================================================
-- 039_employment_profile.sql  —  Módulo de empleabilidad: perfil
-- =============================================================================
-- Idempotente. Correr manualmente en el SQL Editor DESPUÉS de
-- 038_employment_ikigai.sql. Ver docs/MODULO_EMPLEO.md para el diseño completo.
--
-- employment_profiles + experience_entries + skill_items + education_entries
-- son la "fuente única de verdad" de experiencia/habilidades del usuario:
-- ningún CV puede contener algo que no exista primero aquí.
--
-- origin_type/origin_ref_id trazan de dónde salió cada entrada (ikigai,
-- Descúbrete, o agregada a mano). origin_ref_id es intencionalmente sin FK:
-- es polimórfico (apunta a ikigai_profiles o a exploration_insights según
-- origin_type) y ninguno de los dos casos requiere integridad referencial
-- estricta — es solo trazabilidad informativa.
-- =============================================================================


-- 1. Perfil — 1:1 con el usuario ------------------------------------------------
create table if not exists public.employment_profiles (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null unique references public.users (id) on delete cascade,
  headline   text not null default '',
  summary    text not null default '',
  updated_at timestamptz not null default now()
);


-- 2. Experiencia ----------------------------------------------------------------
create table if not exists public.experience_entries (
  id                   uuid primary key default gen_random_uuid(),
  profile_id           uuid not null references public.employment_profiles (id) on delete cascade,
  organization         text not null,
  role                 text not null,
  location             text,
  start_date           text,   -- "YYYY-MM", texto libre por simplicidad de UI
  end_date             text,
  is_current           boolean not null default false,
  context_description  text not null default '',
  order_index          int not null default 0,
  origin_type          text not null check (origin_type in ('ikigai', 'exploration', 'manual')),
  origin_ref_id        uuid
);
create index if not exists idx_experience_entries_profile_id on public.experience_entries (profile_id);


-- 3. Habilidades ------------------------------------------------------------------
create table if not exists public.skill_items (
  id             uuid primary key default gen_random_uuid(),
  profile_id     uuid not null references public.employment_profiles (id) on delete cascade,
  name           text not null,
  category       text not null check (category in ('hard', 'soft', 'tool', 'language')),
  origin_type    text not null check (origin_type in ('ikigai', 'exploration', 'manual')),
  origin_ref_id  uuid
);
create index if not exists idx_skill_items_profile_id on public.skill_items (profile_id);


-- 4. Educación --------------------------------------------------------------------
create table if not exists public.education_entries (
  id              uuid primary key default gen_random_uuid(),
  profile_id      uuid not null references public.employment_profiles (id) on delete cascade,
  institution     text not null,
  degree          text not null,
  field_of_study  text,
  start_date      text,
  end_date        text,
  is_current      boolean not null default false
);
create index if not exists idx_education_entries_profile_id on public.education_entries (profile_id);


-- 5. RLS ----------------------------------------------------------------------
alter table public.employment_profiles enable row level security;
alter table public.experience_entries  enable row level security;
alter table public.skill_items         enable row level security;
alter table public.education_entries   enable row level security;

grant select, insert, update, delete on public.employment_profiles to authenticated;
grant select, insert, update, delete on public.experience_entries  to authenticated;
grant select, insert, update, delete on public.skill_items         to authenticated;
grant select, insert, update, delete on public.education_entries   to authenticated;

-- 5.1 employment_profiles: dueño total
drop policy if exists employment_profiles_owner_all on public.employment_profiles;
create policy employment_profiles_owner_all
  on public.employment_profiles for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- 5.2 experience_entries: dueño total vía employment_profiles.user_id
drop policy if exists experience_entries_owner_all on public.experience_entries;
create policy experience_entries_owner_all
  on public.experience_entries for all to authenticated
  using (exists (
    select 1 from public.employment_profiles p
    where p.id = profile_id and p.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.employment_profiles p
    where p.id = profile_id and p.user_id = auth.uid()
  ));

-- 5.3 skill_items: dueño total vía employment_profiles.user_id
drop policy if exists skill_items_owner_all on public.skill_items;
create policy skill_items_owner_all
  on public.skill_items for all to authenticated
  using (exists (
    select 1 from public.employment_profiles p
    where p.id = profile_id and p.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.employment_profiles p
    where p.id = profile_id and p.user_id = auth.uid()
  ));

-- 5.4 education_entries: dueño total vía employment_profiles.user_id
drop policy if exists education_entries_owner_all on public.education_entries;
create policy education_entries_owner_all
  on public.education_entries for all to authenticated
  using (exists (
    select 1 from public.employment_profiles p
    where p.id = profile_id and p.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.employment_profiles p
    where p.id = profile_id and p.user_id = auth.uid()
  ));


-- =============================================================================
-- Verificar tras correr:
--   select tablename, policyname from pg_policies
--   where tablename in ('employment_profiles','experience_entries','skill_items','education_entries');
-- =============================================================================
