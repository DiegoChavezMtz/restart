-- =============================================================================
-- 030_appointment_roles_and_test_exclusion.sql
-- Roles de citas, mentoras psicólogas y exclusión histórica de cuentas test.
-- =============================================================================

alter table public.appointments
  add column if not exists is_test_appointment boolean not null default false;

create index if not exists idx_appointments_operational_participant
  on public.appointments (participant_id, starts_at desc)
  where is_test_appointment = false;

create or replace function public.validate_appointment_mentor()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.users u
    where u.id = new.mentor_id
      and u.is_active = true
      and (
        u.role in ('super_admin', 'admin')
        or (u.role = 'psicologa' and exists (
          select 1 from public.user_capabilities c
          where c.user_id = u.id and c.capability = 'manage_appointment_availability' and c.revoked_at is null
        ))
      )
  ) then
    raise exception 'el mentor requiere autorización de disponibilidad activa';
  end if;
  return new;
end;
$$;

create or replace function public.is_appointment_owner(p_appointment_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.appointments a
    join public.users u on u.id = a.mentor_id
    where a.id = p_appointment_id
      and a.mentor_id = auth.uid()
      and u.is_active = true
      and u.role in ('super_admin', 'admin', 'psicologa')
  );
$$;

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
  v_is_staff boolean := public.can_manage_appointments();
  v_is_test boolean;
  v_slot public.appointment_slots%rowtype;
  v_participant_cohort uuid;
  v_participant_cohort_name text;
  v_appointment_type_name text;
  v_appointment_id uuid;
begin
  if v_actor is null then raise exception 'autenticación requerida'; end if;
  if v_participant <> v_actor and not v_is_staff then
    raise exception 'solo personal autorizado puede reservar para otra persona';
  end if;

  select u.cohort_id, u.role = 'test' into v_participant_cohort, v_is_test
  from public.users u
  where u.id = v_participant
    and u.role in ('usuario', 'test')
    and u.is_active = true
  for update;
  if not found then raise exception 'usuario inexistente o inactivo'; end if;

  select c.name into v_participant_cohort_name from public.cohorts c where c.id = v_participant_cohort;
  select * into v_slot from public.appointment_slots s where s.id = p_slot_id for update;
  if not found or v_slot.status <> 'available' then raise exception 'el espacio ya no está disponible'; end if;
  select t.name into v_appointment_type_name from public.appointment_types t where t.id = v_slot.appointment_type_id;
  if v_appointment_type_name is null then raise exception 'tipo de cita inexistente'; end if;

  if not v_is_staff and v_slot.starts_at < now() + interval '24 hours' then
    raise exception 'la cita debe reservarse con al menos 24 horas de anticipación';
  end if;
  if not v_is_staff and not exists (
    select 1 from public.appointment_slot_cohorts sc
    where sc.slot_id = p_slot_id and sc.cohort_id = v_participant_cohort
  ) then raise exception 'el espacio no está habilitado para la cohorte del usuario'; end if;
  if exists (
    select 1 from public.appointments a
    where a.participant_id = v_participant and a.status = 'reserved' and a.ends_at > now()
  ) then raise exception 'el usuario ya tiene una cita futura activa'; end if;

  insert into public.appointments (
    slot_id, participant_id, mentor_id, participant_cohort_id, participant_cohort_name,
    appointment_type_id, appointment_type_name, starts_at, ends_at, duration_minutes,
    modality, location_text, status, booked_by, is_test_appointment
  ) values (
    v_slot.id, v_participant, v_slot.mentor_id, v_participant_cohort, v_participant_cohort_name,
    v_slot.appointment_type_id, v_appointment_type_name, v_slot.starts_at, v_slot.ends_at,
    v_slot.duration_minutes, v_slot.modality, v_slot.location_text,
    'reserved', v_actor, v_is_test
  ) returning id into v_appointment_id;
  update public.appointment_slots set status = 'booked', updated_at = now() where id = p_slot_id;
  return v_appointment_id;
end;
$$;

create or replace function public.cancel_appointment(p_appointment_id uuid, p_reason text default null)
returns void language plpgsql security definer set search_path = public as $$
declare v_appointment public.appointments%rowtype; v_is_participant boolean; v_is_owner boolean;
begin
  select * into v_appointment from public.appointments a where a.id = p_appointment_id for update;
  if not found or v_appointment.status <> 'reserved' then raise exception 'la cita no existe o ya no está reservada'; end if;
  v_is_participant := v_appointment.participant_id = auth.uid();
  v_is_owner := public.is_appointment_owner(p_appointment_id) or public.is_super_admin();
  if not v_is_participant and not v_is_owner then raise exception 'no autorizado para cancelar esta cita'; end if;
  if v_is_participant and v_appointment.starts_at < now() + interval '2 hours' then raise exception 'la cita solo puede cancelarse con al menos 2 horas de anticipación'; end if;
  update public.appointments set status = case when v_is_participant then 'cancelled_by_participant' else 'cancelled_by_admin' end,
    cancelled_at = now(), cancelled_by = auth.uid(), updated_at = now() where id = p_appointment_id;
  update public.appointment_slots set status = case when v_is_participant and v_appointment.starts_at >= now() + interval '24 hours' then 'available' else 'withdrawn' end,
    updated_at = now() where id = v_appointment.slot_id;
  update public.appointment_status_history set reason = p_reason where id = (
    select h.id from public.appointment_status_history h where h.appointment_id = p_appointment_id order by h.created_at desc limit 1
  );
end;
$$;

create or replace function public.close_appointment(p_appointment_id uuid, p_status text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_status not in ('completed', 'no_show') then raise exception 'estado de cierre inválido'; end if;
  if not public.is_appointment_owner(p_appointment_id) and not public.is_super_admin() then raise exception 'solo el mentor propietario puede cerrar la cita'; end if;
  update public.appointments set status = p_status, completed_at = case when p_status = 'completed' then now() else null end,
    updated_at = now() where id = p_appointment_id and status = 'reserved';
  if not found then raise exception 'la cita no existe o no está reservada'; end if;
end;
$$;

-- Las psicólogas con capacidad delegada administran únicamente su agenda.
drop policy if exists availability_rules_owner_all on public.appointment_availability_rules;
create policy availability_rules_owner_all on public.appointment_availability_rules for all to authenticated
  using (mentor_id = auth.uid() and public.can_manage_appointment_availability())
  with check (mentor_id = auth.uid() and public.can_manage_appointment_availability());
drop policy if exists appointment_slots_admin_select on public.appointment_slots;
create policy appointment_slots_staff_select on public.appointment_slots for select to authenticated
  using (public.can_manage_appointment_availability());
drop policy if exists appointment_slots_owner_insert on public.appointment_slots;
create policy appointment_slots_owner_insert on public.appointment_slots for insert to authenticated
  with check (mentor_id = auth.uid() and public.can_manage_appointment_availability());
drop policy if exists appointment_slots_owner_update on public.appointment_slots;
create policy appointment_slots_owner_update on public.appointment_slots for update to authenticated
  using (mentor_id = auth.uid() and public.can_manage_appointment_availability())
  with check (mentor_id = auth.uid() and public.can_manage_appointment_availability());
drop policy if exists appointment_slots_owner_delete on public.appointment_slots;
create policy appointment_slots_owner_delete on public.appointment_slots for delete to authenticated
  using (mentor_id = auth.uid() and public.can_manage_appointment_availability());

-- El cumplimiento mensual sólo se calcula para usuarios operativos, nunca tests.
create or replace function public.create_monthly_mentoring_notifications(
  p_month date default ((date_trunc('month', now() at time zone 'America/Mexico_City') - interval '1 month')::date)
) returns integer language plpgsql security definer set search_path = public as $$
declare v_month_start date := date_trunc('month', p_month)::date; v_month_end date := (date_trunc('month', p_month) + interval '1 month')::date; v_inserted integer := 0; v_count integer;
begin
  if auth.uid() is not null and not public.can_manage_appointments() then raise exception 'solo personal autorizado puede generar alertas'; end if;
  with non_compliant as (
    select u.id, u.full_name from public.users u where u.role = 'usuario' and u.is_active and u.cohort_id is not null
      and not exists (select 1 from public.mentoring_compliance_exempt_cohorts ec where ec.cohort_id = u.cohort_id)
      and not exists (select 1 from public.appointments a join public.appointment_types t on t.id = a.appointment_type_id
        where a.participant_id = u.id and a.is_test_appointment = false and a.status = 'completed' and t.counts_for_monthly_mentoring
          and (a.starts_at at time zone 'America/Mexico_City')::date >= v_month_start and (a.starts_at at time zone 'America/Mexico_City')::date < v_month_end)
  ) insert into public.internal_notifications (recipient_id, type, title, body, related_entity_type, related_entity_id, deduplication_key)
    select n.id, 'monthly_mentoring_missing', 'Mentoría mensual pendiente', 'No se registró una mentoría completada durante ' || to_char(v_month_start, 'YYYY-MM') || '.', 'user', n.id,
      'monthly-mentoring:' || to_char(v_month_start, 'YYYY-MM') || ':participant' from non_compliant n on conflict do nothing;
  get diagnostics v_count = row_count; v_inserted := v_inserted + v_count;
  with non_compliant as (
    select u.id, u.full_name from public.users u where u.role = 'usuario' and u.is_active and u.cohort_id is not null
      and not exists (select 1 from public.mentoring_compliance_exempt_cohorts ec where ec.cohort_id = u.cohort_id)
      and not exists (select 1 from public.appointments a join public.appointment_types t on t.id = a.appointment_type_id where a.participant_id = u.id and a.is_test_appointment = false and a.status = 'completed' and t.counts_for_monthly_mentoring and (a.starts_at at time zone 'America/Mexico_City')::date >= v_month_start and (a.starts_at at time zone 'America/Mexico_City')::date < v_month_end)
  ) insert into public.internal_notifications (recipient_id, type, title, body, related_entity_type, related_entity_id, deduplication_key)
    select admin.id, 'participant_monthly_mentoring_missing', 'Participante sin mentoría mensual', n.full_name || ' no tiene una mentoría completada durante ' || to_char(v_month_start, 'YYYY-MM') || '.', 'user', n.id,
      'monthly-mentoring:' || to_char(v_month_start, 'YYYY-MM') || ':participant:' || n.id::text from non_compliant n cross join public.users admin
      where admin.role in ('super_admin', 'admin') and admin.is_active on conflict do nothing;
  get diagnostics v_count = row_count; return v_inserted + v_count;
end;
$$;
