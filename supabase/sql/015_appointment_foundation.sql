-- =============================================================================
-- 015_appointment_foundation.sql — Base del módulo de citas
-- =============================================================================
-- Idempotente. Ejecutar después de 014_attendance.sql.

create extension if not exists btree_gist;

alter table public.users
  add column if not exists is_active boolean not null default true;

create index if not exists idx_users_active_participants_by_cohort
  on public.users (cohort_id, id)
  where role = 'participant' and is_active = true;

-- La excepción vive separada de cohorts porque pertenece a una política concreta.
create table if not exists public.mentoring_compliance_exempt_cohorts (
  cohort_id uuid primary key references public.cohorts (id) on delete cascade,
  reason text,
  created_by uuid not null references public.users (id),
  created_at timestamptz not null default now()
);

create table if not exists public.appointment_types (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  normalized_name text not null,
  description text,
  counts_for_monthly_mentoring boolean not null default false,
  is_sensitive boolean not null default false,
  is_active boolean not null default true,
  created_by uuid not null references public.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (name = btrim(name) and name <> ''),
  check (normalized_name = lower(btrim(normalized_name)) and normalized_name <> ''),
  unique (normalized_name)
);

create table if not exists public.appointment_tags (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  normalized_name text not null,
  is_active boolean not null default true,
  created_by uuid not null references public.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (name = btrim(name) and name <> ''),
  check (normalized_name = lower(btrim(normalized_name)) and normalized_name <> ''),
  unique (normalized_name)
);

-- Centraliza trim/lower y evita que clientes distintos normalicen de forma diferente.
create or replace function public.normalize_catalog_name()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.name := regexp_replace(btrim(new.name), '\s+', ' ', 'g');
  new.normalized_name := lower(new.name);
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists normalize_appointment_type_name on public.appointment_types;
create trigger normalize_appointment_type_name
  before insert or update on public.appointment_types
  for each row execute function public.normalize_catalog_name();

drop trigger if exists normalize_appointment_tag_name on public.appointment_tags;
create trigger normalize_appointment_tag_name
  before insert or update on public.appointment_tags
  for each row execute function public.normalize_catalog_name();

alter table public.mentoring_compliance_exempt_cohorts enable row level security;
alter table public.appointment_types enable row level security;
alter table public.appointment_tags enable row level security;

grant select, insert, update, delete on public.mentoring_compliance_exempt_cohorts to authenticated;
grant select, insert, update, delete on public.appointment_types to authenticated;
grant select, insert, update, delete on public.appointment_tags to authenticated;

drop policy if exists mentoring_exempt_cohorts_admin_all on public.mentoring_compliance_exempt_cohorts;
create policy mentoring_exempt_cohorts_admin_all
  on public.mentoring_compliance_exempt_cohorts for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists appointment_types_admin_all on public.appointment_types;
create policy appointment_types_admin_all
  on public.appointment_types for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists appointment_types_participant_select on public.appointment_types;
create policy appointment_types_participant_select
  on public.appointment_types for select to authenticated
  using (is_active = true);

drop policy if exists appointment_tags_admin_all on public.appointment_tags;
create policy appointment_tags_admin_all
  on public.appointment_tags for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
