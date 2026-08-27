-- =============================================================================
-- 038_employment_ikigai.sql  —  Módulo de empleabilidad: ikigai
-- =============================================================================
-- Idempotente. Correr manualmente en el SQL Editor DESPUÉS de
-- 037_list_assigned_psychological_cases.sql. Ver docs/MODULO_EMPLEO.md para el
-- diseño completo del módulo.
--
-- El ikigai es deliberadamente independiente del sistema de Forms: una
-- FormResponse se bloquea tras enviarse (navegación lineal sin retroceso),
-- mientras que el ikigai debe permanecer siempre visible y editable. Por eso
-- vive como tabla propia, 1:1 con el usuario, sin relación con forms/answers.
--
-- Privacidad: 100% privado — solo el propio usuario puede leer/escribir su
-- fila. Sin policy de admin/psicóloga en v1 (ver docs/MODULO_EMPLEO.md §9).
-- =============================================================================


-- 1. Tabla ------------------------------------------------------------------
create table if not exists public.ikigai_profiles (
  id                        uuid primary key default gen_random_uuid(),
  user_id                   uuid not null unique references public.users (id) on delete cascade,
  what_you_love             text not null default '',
  what_you_are_good_at      text not null default '',
  what_world_needs          text not null default '',
  what_you_can_be_paid_for  text not null default '',
  synthesis                 text,
  updated_at                timestamptz not null default now()
);
-- UNIQUE (user_id) ya cubre el lookup "mi ikigai" — no requiere índice adicional.


-- 2. RLS ----------------------------------------------------------------------
alter table public.ikigai_profiles enable row level security;

grant select, insert, update, delete on public.ikigai_profiles to authenticated;

drop policy if exists ikigai_profiles_owner_all on public.ikigai_profiles;
create policy ikigai_profiles_owner_all
  on public.ikigai_profiles for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());


-- =============================================================================
-- Verificar tras correr:
--   select tablename, policyname from pg_policies where tablename = 'ikigai_profiles';
-- =============================================================================
