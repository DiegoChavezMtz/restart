-- =============================================================================
-- 018_appointment_follow_up.sql — Expedientes, notas, objetivos y compromisos
-- =============================================================================

create table if not exists public.participant_cases (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.users (id),
  appointment_type_id uuid references public.appointment_types (id),
  owner_id uuid not null references public.users (id),
  title text not null check (btrim(title) <> ''),
  status text not null default 'open' check (status in ('open', 'closed')),
  is_sensitive boolean not null default false,
  created_by uuid not null references public.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.participant_case_admins (
  case_id uuid not null references public.participant_cases (id) on delete cascade,
  admin_id uuid not null references public.users (id),
  granted_by uuid not null references public.users (id),
  granted_at timestamptz not null default now(),
  primary key (case_id, admin_id)
);

create table if not exists public.participant_case_appointments (
  case_id uuid not null references public.participant_cases (id) on delete cascade,
  appointment_id uuid not null references public.appointments (id) on delete cascade,
  linked_by uuid not null references public.users (id),
  linked_at timestamptz not null default now(),
  primary key (case_id, appointment_id),
  unique (appointment_id)
);

create table if not exists public.appointment_notes (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments (id) on delete cascade,
  content text not null,
  created_by uuid not null references public.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.appointment_goals (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments (id) on delete cascade,
  description text not null check (btrim(description) <> ''),
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.appointment_commitments (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments (id) on delete cascade,
  description text not null check (btrim(description) <> ''),
  status text not null default 'pending' check (status in ('pending', 'completed')),
  sort_order integer not null default 0 check (sort_order >= 0),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (status = 'completed' and completed_at is not null)
    or (status = 'pending' and completed_at is null)
  )
);

create index if not exists idx_participant_cases_participant
  on public.participant_cases (participant_id, created_at desc);
create index if not exists idx_participant_cases_owner
  on public.participant_cases (owner_id, status);
create index if not exists idx_appointment_notes_appointment
  on public.appointment_notes (appointment_id, created_at);
create index if not exists idx_appointment_goals_appointment
  on public.appointment_goals (appointment_id, sort_order);
create index if not exists idx_appointment_commitments_appointment
  on public.appointment_commitments (appointment_id, sort_order);

create or replace function public.is_case_authorized(p_case_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.is_admin() and exists (
    select 1 from public.participant_cases c
    where c.id = p_case_id
      and (
        not c.is_sensitive
        or c.owner_id = auth.uid()
        or exists (
          select 1 from public.participant_case_admins ca
          where ca.case_id = c.id and ca.admin_id = auth.uid()
        )
      )
  );
$$;

create or replace function public.is_case_owner(p_case_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.is_admin() and exists (
    select 1 from public.participant_cases c
    where c.id = p_case_id and c.owner_id = auth.uid()
  );
$$;

create or replace function public.is_appointment_owner(p_appointment_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.is_admin() and exists (
    select 1 from public.appointments a
    where a.id = p_appointment_id and a.mentor_id = auth.uid()
  );
$$;

create or replace function public.can_read_appointment_follow_up(p_appointment_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.is_admin() and (
    not exists (
      select 1
      from public.participant_case_appointments ca
      join public.participant_cases c on c.id = ca.case_id
      where ca.appointment_id = p_appointment_id and c.is_sensitive = true
    )
    or exists (
      select 1
      from public.participant_case_appointments ca
      where ca.appointment_id = p_appointment_id
        and public.is_case_authorized(ca.case_id)
    )
  );
$$;

create or replace function public.validate_case_participants()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.users u
    where u.id = new.participant_id and u.role = 'participant'
  ) then
    raise exception 'el expediente requiere un participante';
  end if;
  if not exists (
    select 1 from public.users u
    where u.id = new.owner_id and u.role = 'admin' and u.is_active = true
  ) then
    raise exception 'el propietario debe ser un administrador activo';
  end if;
  return new;
end;
$$;

drop trigger if exists validate_case_participants on public.participant_cases;
create trigger validate_case_participants
  before insert or update of participant_id, owner_id on public.participant_cases
  for each row execute function public.validate_case_participants();

alter table public.participant_cases enable row level security;
alter table public.participant_case_admins enable row level security;
alter table public.participant_case_appointments enable row level security;
alter table public.appointment_notes enable row level security;
alter table public.appointment_goals enable row level security;
alter table public.appointment_commitments enable row level security;

grant select, insert, update, delete on public.participant_cases to authenticated;
grant select, insert, delete on public.participant_case_admins to authenticated;
grant select, insert, delete on public.participant_case_appointments to authenticated;
grant select, insert, update, delete on public.appointment_notes to authenticated;
grant select, insert, update, delete on public.appointment_goals to authenticated;
grant select, insert, update, delete on public.appointment_commitments to authenticated;

-- Expedientes no sensibles: todos los admins leen. Sensibles: propietario/autorizados.
drop policy if exists participant_cases_authorized_select on public.participant_cases;
create policy participant_cases_authorized_select on public.participant_cases
  for select to authenticated using (public.is_case_authorized(id));
drop policy if exists participant_cases_admin_insert on public.participant_cases;
create policy participant_cases_admin_insert on public.participant_cases
  for insert to authenticated with check (public.is_admin() and created_by = auth.uid());
drop policy if exists participant_cases_owner_update on public.participant_cases;
create policy participant_cases_owner_update on public.participant_cases
  for update to authenticated using (owner_id = auth.uid()) with check (public.is_admin());
drop policy if exists participant_cases_owner_delete on public.participant_cases;
create policy participant_cases_owner_delete on public.participant_cases
  for delete to authenticated using (owner_id = auth.uid());

drop policy if exists case_admins_authorized_select on public.participant_case_admins;
create policy case_admins_authorized_select on public.participant_case_admins
  for select to authenticated using (public.is_case_authorized(case_id));
drop policy if exists case_admins_owner_insert on public.participant_case_admins;
create policy case_admins_owner_insert on public.participant_case_admins
  for insert to authenticated with check (public.is_case_owner(case_id));
drop policy if exists case_admins_owner_delete on public.participant_case_admins;
create policy case_admins_owner_delete on public.participant_case_admins
  for delete to authenticated using (public.is_case_owner(case_id));

drop policy if exists case_appointments_authorized_select on public.participant_case_appointments;
create policy case_appointments_authorized_select on public.participant_case_appointments
  for select to authenticated using (public.is_case_authorized(case_id));
drop policy if exists case_appointments_owner_all on public.participant_case_appointments;
create policy case_appointments_owner_all on public.participant_case_appointments
  for all to authenticated
  using (public.is_case_owner(case_id))
  with check (public.is_case_owner(case_id));

-- Seguimiento: lectura autorizada, escritura exclusiva del mentor de la cita.
drop policy if exists appointment_notes_admin_select on public.appointment_notes;
create policy appointment_notes_admin_select on public.appointment_notes
  for select to authenticated using (public.can_read_appointment_follow_up(appointment_id));
drop policy if exists appointment_notes_owner_all on public.appointment_notes;
create policy appointment_notes_owner_all on public.appointment_notes
  for all to authenticated
  using (public.is_appointment_owner(appointment_id))
  with check (public.is_appointment_owner(appointment_id) and created_by = auth.uid());

drop policy if exists appointment_goals_admin_select on public.appointment_goals;
create policy appointment_goals_admin_select on public.appointment_goals
  for select to authenticated using (public.can_read_appointment_follow_up(appointment_id));
drop policy if exists appointment_goals_owner_all on public.appointment_goals;
create policy appointment_goals_owner_all on public.appointment_goals
  for all to authenticated
  using (public.is_appointment_owner(appointment_id))
  with check (public.is_appointment_owner(appointment_id));

drop policy if exists appointment_commitments_admin_select on public.appointment_commitments;
create policy appointment_commitments_admin_select on public.appointment_commitments
  for select to authenticated using (public.can_read_appointment_follow_up(appointment_id));
drop policy if exists appointment_commitments_owner_all on public.appointment_commitments;
create policy appointment_commitments_owner_all on public.appointment_commitments
  for all to authenticated
  using (public.is_appointment_owner(appointment_id))
  with check (public.is_appointment_owner(appointment_id));
