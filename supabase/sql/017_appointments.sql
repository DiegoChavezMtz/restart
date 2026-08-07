-- =============================================================================
-- 017_appointments.sql — Citas, estados y operaciones transaccionales
-- =============================================================================

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  slot_id uuid not null references public.appointment_slots (id),
  participant_id uuid not null references public.users (id),
  mentor_id uuid not null references public.users (id),
  participant_cohort_id uuid references public.cohorts (id) on delete set null,
  participant_cohort_name text,
  appointment_type_id uuid not null references public.appointment_types (id),
  appointment_type_name text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  duration_minutes integer not null check (duration_minutes in (30, 60, 90, 120)),
  modality text not null check (modality in ('remote', 'in_person')),
  location_text text,
  remote_meeting_url text,
  status text not null default 'reserved'
    check (status in (
      'reserved', 'completed', 'cancelled_by_participant',
      'cancelled_by_admin', 'no_show'
    )),
  booked_by uuid not null references public.users (id),
  booked_at timestamptz not null default now(),
  completed_at timestamptz,
  cancelled_at timestamptz,
  cancelled_by uuid references public.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at),
  check (ends_at = starts_at + make_interval(mins => duration_minutes)),
  check (
    (status = 'completed' and completed_at is not null)
    or (status <> 'completed' and completed_at is null)
  ),
  check (
    (status in ('cancelled_by_participant', 'cancelled_by_admin')
      and cancelled_at is not null and cancelled_by is not null)
    or (status not in ('cancelled_by_participant', 'cancelled_by_admin')
      and cancelled_at is null and cancelled_by is null)
  )
);

create table if not exists public.appointment_status_history (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments (id) on delete cascade,
  previous_status text,
  new_status text not null check (new_status in (
    'reserved', 'completed', 'cancelled_by_participant',
    'cancelled_by_admin', 'no_show'
  )),
  changed_by uuid not null references public.users (id),
  reason text,
  created_at timestamptz not null default now()
);

create table if not exists public.appointment_tag_map (
  appointment_id uuid not null references public.appointments (id) on delete cascade,
  tag_id uuid not null references public.appointment_tags (id),
  assigned_by uuid not null references public.users (id),
  assigned_at timestamptz not null default now(),
  primary key (appointment_id, tag_id)
);

create index if not exists idx_appointments_participant_timeline
  on public.appointments (participant_id, starts_at desc);
create index if not exists idx_appointments_mentor_calendar
  on public.appointments (mentor_id, starts_at);
create index if not exists idx_appointments_cohort_start
  on public.appointments (participant_cohort_id, starts_at);
create index if not exists idx_appointment_status_history_appointment
  on public.appointment_status_history (appointment_id, created_at);

-- Un slot puede conservar reservas canceladas históricas, pero solo una activa.
create unique index if not exists uq_appointments_active_slot
  on public.appointments (slot_id)
  where status = 'reserved';

-- Defensa adicional contra citas activas traslapadas para el mismo mentor.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'appointments_no_active_mentor_overlap'
  ) then
    alter table public.appointments
      add constraint appointments_no_active_mentor_overlap
      exclude using gist (
        mentor_id with =,
        tstzrange(starts_at, ends_at, '[)') with &&
      ) where (status = 'reserved');
  end if;
end;
$$;

create or replace function public.record_appointment_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.appointment_status_history
      (appointment_id, previous_status, new_status, changed_by)
    values (new.id, null, new.status, new.booked_by);
  elsif new.status is distinct from old.status then
    insert into public.appointment_status_history
      (appointment_id, previous_status, new_status, changed_by)
    values (new.id, old.status, new.status, auth.uid());
  end if;
  return new;
end;
$$;

drop trigger if exists record_appointment_status_change on public.appointments;
create trigger record_appointment_status_change
  after insert or update of status on public.appointments
  for each row execute function public.record_appointment_status_change();

-- Reserva atómica. El bloqueo del usuario serializa intentos concurrentes del
-- mismo participante; el bloqueo del slot hace que solo uno gane ese horario.
create or replace function public.reserve_appointment(
  p_slot_id uuid,
  p_participant_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_participant uuid := coalesce(p_participant_id, auth.uid());
  v_is_admin boolean := public.is_admin();
  v_slot public.appointment_slots%rowtype;
  v_participant_cohort uuid;
  v_participant_cohort_name text;
  v_appointment_type_name text;
  v_appointment_id uuid;
begin
  if v_actor is null then
    raise exception 'autenticación requerida';
  end if;

  if v_participant <> v_actor and not v_is_admin then
    raise exception 'solo un administrador puede reservar para otra persona';
  end if;

  -- También valida que sea participante activo y serializa sus reservas.
  select u.cohort_id into v_participant_cohort
  from public.users u
  where u.id = v_participant and u.role = 'participant' and u.is_active = true
  for update;

  if not found then
    raise exception 'participante inexistente o inactivo';
  end if;

  select c.name into v_participant_cohort_name
  from public.cohorts c where c.id = v_participant_cohort;

  select * into v_slot
  from public.appointment_slots s
  where s.id = p_slot_id
  for update;

  if not found or v_slot.status <> 'available' then
    raise exception 'el espacio ya no está disponible';
  end if;

  select t.name into v_appointment_type_name
  from public.appointment_types t where t.id = v_slot.appointment_type_id;
  if v_appointment_type_name is null then
    raise exception 'tipo de cita inexistente';
  end if;

  if not v_is_admin and v_slot.starts_at < now() + interval '24 hours' then
    raise exception 'la cita debe reservarse con al menos 24 horas de anticipación';
  end if;

  if not v_is_admin and not exists (
    select 1 from public.appointment_slot_cohorts sc
    where sc.slot_id = p_slot_id and sc.cohort_id = v_participant_cohort
  ) then
    raise exception 'el espacio no está habilitado para la cohorte del participante';
  end if;

  if exists (
    select 1 from public.appointments a
    where a.participant_id = v_participant
      and a.status = 'reserved'
      and a.ends_at > now()
  ) then
    raise exception 'el participante ya tiene una cita futura activa';
  end if;

  insert into public.appointments (
    slot_id, participant_id, mentor_id, participant_cohort_id, participant_cohort_name,
    appointment_type_id, appointment_type_name, starts_at, ends_at, duration_minutes,
    modality, location_text, status, booked_by
  ) values (
    v_slot.id, v_participant, v_slot.mentor_id, v_participant_cohort, v_participant_cohort_name,
    v_slot.appointment_type_id, v_appointment_type_name, v_slot.starts_at, v_slot.ends_at,
    v_slot.duration_minutes, v_slot.modality, v_slot.location_text,
    'reserved', v_actor
  ) returning id into v_appointment_id;

  update public.appointment_slots
  set status = 'booked', updated_at = now()
  where id = p_slot_id;

  return v_appointment_id;
end;
$$;

create or replace function public.cancel_appointment(
  p_appointment_id uuid,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_appointment public.appointments%rowtype;
  v_is_participant boolean;
  v_is_owner boolean;
begin
  select * into v_appointment
  from public.appointments a
  where a.id = p_appointment_id
  for update;

  if not found or v_appointment.status <> 'reserved' then
    raise exception 'la cita no existe o ya no está reservada';
  end if;

  v_is_participant := v_appointment.participant_id = auth.uid();
  v_is_owner := v_appointment.mentor_id = auth.uid() and public.is_admin();

  if not v_is_participant and not v_is_owner then
    raise exception 'no autorizado para cancelar esta cita';
  end if;

  if v_is_participant and v_appointment.starts_at < now() + interval '2 hours' then
    raise exception 'la cita solo puede cancelarse con al menos 2 horas de anticipación';
  end if;

  update public.appointments
  set status = case when v_is_participant
      then 'cancelled_by_participant' else 'cancelled_by_admin' end,
      cancelled_at = now(),
      cancelled_by = auth.uid(),
      updated_at = now()
  where id = p_appointment_id;

  -- Solo una cancelación del participante con >=24h vuelve a publicar el slot.
  if v_is_participant and v_appointment.starts_at >= now() + interval '24 hours' then
    update public.appointment_slots
    set status = 'available', updated_at = now()
    where id = v_appointment.slot_id;
  else
    update public.appointment_slots
    set status = 'withdrawn', updated_at = now()
    where id = v_appointment.slot_id;
  end if;

  update public.appointment_status_history
  set reason = p_reason
  where id = (
    select h.id from public.appointment_status_history h
    where h.appointment_id = p_appointment_id
    order by h.created_at desc limit 1
  );
end;
$$;

create or replace function public.close_appointment(
  p_appointment_id uuid,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_appointment public.appointments%rowtype;
begin
  if p_status not in ('completed', 'no_show') then
    raise exception 'estado de cierre inválido';
  end if;

  select * into v_appointment
  from public.appointments a where a.id = p_appointment_id for update;

  if not found or v_appointment.status <> 'reserved' then
    raise exception 'la cita no existe o no está reservada';
  end if;
  if v_appointment.mentor_id <> auth.uid() or not public.is_admin() then
    raise exception 'solo el mentor propietario puede cerrar la cita';
  end if;

  update public.appointments
  set status = p_status,
      completed_at = case when p_status = 'completed' then now() else null end,
      updated_at = now()
  where id = p_appointment_id;
end;
$$;

revoke all on function public.reserve_appointment(uuid, uuid) from public;
revoke all on function public.cancel_appointment(uuid, text) from public;
revoke all on function public.close_appointment(uuid, text) from public;
grant execute on function public.reserve_appointment(uuid, uuid) to authenticated;
grant execute on function public.cancel_appointment(uuid, text) to authenticated;
grant execute on function public.close_appointment(uuid, text) to authenticated;

alter table public.appointments enable row level security;
alter table public.appointment_status_history enable row level security;
alter table public.appointment_tag_map enable row level security;

grant select on public.appointments to authenticated;
grant select on public.appointment_status_history to authenticated;
grant select, insert, delete on public.appointment_tag_map to authenticated;

drop policy if exists appointments_admin_select on public.appointments;
create policy appointments_admin_select on public.appointments
  for select to authenticated using (public.is_admin());
drop policy if exists appointments_participant_select_own on public.appointments;
create policy appointments_participant_select_own on public.appointments
  for select to authenticated using (participant_id = auth.uid());

drop policy if exists appointment_history_admin_select on public.appointment_status_history;
create policy appointment_history_admin_select on public.appointment_status_history
  for select to authenticated using (public.is_admin());
drop policy if exists appointment_history_participant_select on public.appointment_status_history;
create policy appointment_history_participant_select on public.appointment_status_history
  for select to authenticated using (exists (
    select 1 from public.appointments a
    where a.id = appointment_id and a.participant_id = auth.uid()
  ));

drop policy if exists appointment_tag_map_admin_select on public.appointment_tag_map;
create policy appointment_tag_map_admin_select on public.appointment_tag_map
  for select to authenticated using (public.is_admin());
drop policy if exists appointment_tag_map_owner_insert on public.appointment_tag_map;
create policy appointment_tag_map_owner_insert on public.appointment_tag_map
  for insert to authenticated with check (exists (
    select 1 from public.appointments a
    where a.id = appointment_id and a.mentor_id = auth.uid()
  ));
drop policy if exists appointment_tag_map_owner_delete on public.appointment_tag_map;
create policy appointment_tag_map_owner_delete on public.appointment_tag_map
  for delete to authenticated using (exists (
    select 1 from public.appointments a
    where a.id = appointment_id and a.mentor_id = auth.uid()
  ));
