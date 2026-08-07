-- =============================================================================
-- 016_appointment_availability.sql — Reglas recurrentes y espacios reservables
-- =============================================================================
-- Las horas recurrentes se interpretan siempre en America/Mexico_City.

create table if not exists public.appointment_availability_rules (
  id uuid primary key default gen_random_uuid(),
  mentor_id uuid not null references public.users (id),
  appointment_type_id uuid not null references public.appointment_types (id),
  weekday smallint not null check (weekday between 0 and 6), -- 0=domingo
  local_start_time time not null,
  duration_minutes integer not null check (duration_minutes in (30, 60, 90, 120)),
  modality text not null check (modality in ('remote', 'in_person')),
  location_text text,
  valid_from date not null default ((now() at time zone 'America/Mexico_City')::date),
  valid_until date,
  is_active boolean not null default true,
  last_generated_through date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (valid_until is null or valid_until >= valid_from),
  check (
    (modality = 'in_person' and nullif(btrim(location_text), '') is not null)
    or modality = 'remote'
  )
);

create table if not exists public.appointment_availability_rule_cohorts (
  rule_id uuid not null references public.appointment_availability_rules (id) on delete cascade,
  cohort_id uuid not null references public.cohorts (id) on delete cascade,
  primary key (rule_id, cohort_id)
);

create table if not exists public.appointment_availability_exceptions (
  id uuid primary key default gen_random_uuid(),
  rule_id uuid not null references public.appointment_availability_rules (id) on delete cascade,
  exception_date date not null,
  reason text,
  created_at timestamptz not null default now(),
  unique (rule_id, exception_date)
);

create table if not exists public.appointment_slots (
  id uuid primary key default gen_random_uuid(),
  mentor_id uuid not null references public.users (id),
  availability_rule_id uuid references public.appointment_availability_rules (id) on delete set null,
  appointment_type_id uuid not null references public.appointment_types (id),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  duration_minutes integer not null check (duration_minutes in (30, 60, 90, 120)),
  modality text not null check (modality in ('remote', 'in_person')),
  location_text text,
  source text not null check (source in ('recurring', 'manual')),
  status text not null default 'available'
    check (status in ('available', 'held', 'booked', 'expired', 'withdrawn')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at),
  check (ends_at = starts_at + make_interval(mins => duration_minutes)),
  check ((source = 'recurring' and availability_rule_id is not null) or source = 'manual'),
  check (
    (modality = 'in_person' and nullif(btrim(location_text), '') is not null)
    or modality = 'remote'
  )
);

create table if not exists public.appointment_slot_cohorts (
  slot_id uuid not null references public.appointment_slots (id) on delete cascade,
  cohort_id uuid not null references public.cohorts (id) on delete cascade,
  primary key (slot_id, cohort_id)
);

create index if not exists idx_availability_rules_mentor
  on public.appointment_availability_rules (mentor_id, is_active);
create index if not exists idx_appointment_slots_available_start
  on public.appointment_slots (starts_at, appointment_type_id)
  where status = 'available';
create index if not exists idx_appointment_slots_rule
  on public.appointment_slots (availability_rule_id, starts_at);

-- No permite espacios activos traslapados del mismo mentor.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'appointment_slots_no_mentor_overlap'
  ) then
    alter table public.appointment_slots
      add constraint appointment_slots_no_mentor_overlap
      exclude using gist (
        mentor_id with =,
        tstzrange(starts_at, ends_at, '[)') with &&
      ) where (status in ('available', 'held', 'booked'));
  end if;
end;
$$;

create or replace function public.validate_appointment_mentor()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.users u
    where u.id = new.mentor_id and u.role = 'admin' and u.is_active = true
  ) then
    raise exception 'el mentor debe ser un administrador activo';
  end if;
  return new;
end;
$$;

drop trigger if exists validate_availability_rule_mentor on public.appointment_availability_rules;
create trigger validate_availability_rule_mentor
  before insert or update of mentor_id on public.appointment_availability_rules
  for each row execute function public.validate_appointment_mentor();

drop trigger if exists validate_appointment_slot_mentor on public.appointment_slots;
create trigger validate_appointment_slot_mentor
  before insert or update of mentor_id on public.appointment_slots
  for each row execute function public.validate_appointment_mentor();

alter table public.appointment_availability_rules enable row level security;
alter table public.appointment_availability_rule_cohorts enable row level security;
alter table public.appointment_availability_exceptions enable row level security;
alter table public.appointment_slots enable row level security;
alter table public.appointment_slot_cohorts enable row level security;

grant select, insert, update, delete on public.appointment_availability_rules to authenticated;
grant select, insert, update, delete on public.appointment_availability_rule_cohorts to authenticated;
grant select, insert, update, delete on public.appointment_availability_exceptions to authenticated;
grant select, insert, update, delete on public.appointment_slots to authenticated;
grant select, insert, update, delete on public.appointment_slot_cohorts to authenticated;

-- Solo el mentor propietario administra reglas, espacios y sus cohortes.
drop policy if exists availability_rules_owner_all on public.appointment_availability_rules;
create policy availability_rules_owner_all
  on public.appointment_availability_rules for all to authenticated
  using (public.is_admin() and mentor_id = auth.uid())
  with check (public.is_admin() and mentor_id = auth.uid());

drop policy if exists availability_rule_cohorts_owner_all on public.appointment_availability_rule_cohorts;
create policy availability_rule_cohorts_owner_all
  on public.appointment_availability_rule_cohorts for all to authenticated
  using (exists (
    select 1 from public.appointment_availability_rules r
    where r.id = rule_id and r.mentor_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.appointment_availability_rules r
    where r.id = rule_id and r.mentor_id = auth.uid()
  ));

drop policy if exists availability_exceptions_owner_all on public.appointment_availability_exceptions;
create policy availability_exceptions_owner_all
  on public.appointment_availability_exceptions for all to authenticated
  using (exists (
    select 1 from public.appointment_availability_rules r
    where r.id = rule_id and r.mentor_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.appointment_availability_rules r
    where r.id = rule_id and r.mentor_id = auth.uid()
  ));

drop policy if exists appointment_slots_admin_select on public.appointment_slots;
create policy appointment_slots_admin_select
  on public.appointment_slots for select to authenticated
  using (public.is_admin());

drop policy if exists appointment_slots_owner_insert on public.appointment_slots;
create policy appointment_slots_owner_insert
  on public.appointment_slots for insert to authenticated
  with check (public.is_admin() and mentor_id = auth.uid());

drop policy if exists appointment_slots_owner_update on public.appointment_slots;
create policy appointment_slots_owner_update
  on public.appointment_slots for update to authenticated
  using (public.is_admin() and mentor_id = auth.uid())
  with check (public.is_admin() and mentor_id = auth.uid());

drop policy if exists appointment_slots_owner_delete on public.appointment_slots;
create policy appointment_slots_owner_delete
  on public.appointment_slots for delete to authenticated
  using (public.is_admin() and mentor_id = auth.uid());

drop policy if exists appointment_slots_participant_select on public.appointment_slots;
create policy appointment_slots_participant_select
  on public.appointment_slots for select to authenticated
  using (
    status = 'available'
    and starts_at >= now() + interval '24 hours'
    and exists (
      select 1
      from public.appointment_slot_cohorts sc
      join public.users u on u.cohort_id = sc.cohort_id
      where sc.slot_id = appointment_slots.id and u.id = auth.uid()
    )
  );

drop policy if exists appointment_slot_cohorts_admin_select on public.appointment_slot_cohorts;
create policy appointment_slot_cohorts_admin_select
  on public.appointment_slot_cohorts for select to authenticated
  using (public.is_admin());

drop policy if exists appointment_slot_cohorts_owner_all on public.appointment_slot_cohorts;
create policy appointment_slot_cohorts_owner_all
  on public.appointment_slot_cohorts for all to authenticated
  using (exists (
    select 1 from public.appointment_slots s
    where s.id = slot_id and s.mentor_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.appointment_slots s
    where s.id = slot_id and s.mentor_id = auth.uid()
  ));

drop policy if exists appointment_slot_cohorts_participant_select on public.appointment_slot_cohorts;
create policy appointment_slot_cohorts_participant_select
  on public.appointment_slot_cohorts for select to authenticated
  using (cohort_id = (select u.cohort_id from public.users u where u.id = auth.uid()));
