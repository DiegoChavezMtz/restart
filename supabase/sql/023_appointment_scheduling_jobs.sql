-- =============================================================================
-- 023_appointment_scheduling_jobs.sql — Generación, expiración y cumplimiento
-- =============================================================================
-- El proyecto no habilita pg_cron. Estas funciones quedan listas para invocarse
-- desde un scheduler server-side. generate_appointment_slots debe ejecutarse
-- diariamente; expire_appointment_slots al menos cada hora; las alertas, al cerrar mes.

create unique index if not exists uq_active_recurring_slot
  on public.appointment_slots (availability_rule_id, starts_at)
  where availability_rule_id is not null
    and status in ('available', 'held', 'booked');

-- Desactivar un tipo retira su oferta futura sin alterar citas ya reservadas.
create or replace function public.withdraw_inactive_appointment_type_slots()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.is_active = true and new.is_active = false then
    update public.appointment_slots
    set status = 'withdrawn', updated_at = now()
    where appointment_type_id = new.id and status = 'available' and starts_at > now();
  end if;
  return new;
end;
$$;

drop trigger if exists withdraw_inactive_appointment_type_slots on public.appointment_types;
create trigger withdraw_inactive_appointment_type_slots
  after update of is_active on public.appointment_types
  for each row execute function public.withdraw_inactive_appointment_type_slots();

-- Al crear una excepción retira espacios aún no reservados de esa fecha.
create or replace function public.apply_availability_exception()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.appointment_slots s
  set status = 'withdrawn', updated_at = now()
  where s.availability_rule_id = new.rule_id
    and s.status = 'available'
    and (s.starts_at at time zone 'America/Mexico_City')::date = new.exception_date;
  return new;
end;
$$;

drop trigger if exists apply_availability_exception on public.appointment_availability_exceptions;
create trigger apply_availability_exception
  after insert or update on public.appointment_availability_exceptions
  for each row execute function public.apply_availability_exception();

-- Cambiar o eliminar una regla retira únicamente espacios futuros disponibles.
create or replace function public.withdraw_rule_future_slots()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rule_id uuid := old.id;
begin
  if tg_op = 'DELETE'
     or old.weekday is distinct from new.weekday
     or old.local_start_time is distinct from new.local_start_time
     or old.duration_minutes is distinct from new.duration_minutes
     or old.modality is distinct from new.modality
     or old.location_text is distinct from new.location_text
     or old.appointment_type_id is distinct from new.appointment_type_id
     or old.valid_from is distinct from new.valid_from
     or old.valid_until is distinct from new.valid_until
     or old.is_active is distinct from new.is_active then
    update public.appointment_slots
    set status = 'withdrawn', updated_at = now()
    where availability_rule_id = v_rule_id
      and status = 'available'
      and starts_at > now();
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

drop trigger if exists withdraw_rule_future_slots on public.appointment_availability_rules;
create trigger withdraw_rule_future_slots
  before update or delete on public.appointment_availability_rules
  for each row execute function public.withdraw_rule_future_slots();

create or replace function public.generate_appointment_slots(p_days_ahead integer default 30)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rule public.appointment_availability_rules%rowtype;
  v_date date;
  v_start timestamptz;
  v_end timestamptz;
  v_slot_id uuid;
  v_created integer := 0;
  v_today date := (now() at time zone 'America/Mexico_City')::date;
  v_horizon date;
begin
  if p_days_ahead < 1 or p_days_ahead > 60 then
    raise exception 'p_days_ahead debe estar entre 1 y 60';
  end if;
  if auth.uid() is not null and not public.is_admin() then
    raise exception 'solo un administrador o scheduler puede generar espacios';
  end if;
  v_horizon := v_today + p_days_ahead;

  for v_rule in
    select r.* from public.appointment_availability_rules r
    where r.is_active = true
      and r.valid_from <= v_horizon
      and (r.valid_until is null or r.valid_until >= v_today)
  loop
    for v_date in
      select d::date from generate_series(
        greatest(v_today, v_rule.valid_from)::timestamp,
        least(v_horizon, coalesce(v_rule.valid_until, v_horizon))::timestamp,
        interval '1 day'
      ) d
    loop
      if extract(dow from v_date)::smallint <> v_rule.weekday then
        continue;
      end if;
      if exists (
        select 1 from public.appointment_availability_exceptions e
        where e.rule_id = v_rule.id and e.exception_date = v_date
      ) then
        continue;
      end if;

      v_start := (v_date + v_rule.local_start_time) at time zone 'America/Mexico_City';
      v_end := v_start + make_interval(mins => v_rule.duration_minutes);
      if v_start <= now() then
        continue;
      end if;

      v_slot_id := null;
      begin
        insert into public.appointment_slots (
          mentor_id, availability_rule_id, appointment_type_id,
          starts_at, ends_at, duration_minutes, modality,
          location_text, source, status
        ) values (
          v_rule.mentor_id, v_rule.id, v_rule.appointment_type_id,
          v_start, v_end, v_rule.duration_minutes, v_rule.modality,
          v_rule.location_text, 'recurring', 'available'
        )
        on conflict do nothing
        returning id into v_slot_id;
      exception when exclusion_violation then
        v_slot_id := null; -- otra regla/manual ocupa ese rango
      end;

      if v_slot_id is not null then
        insert into public.appointment_slot_cohorts (slot_id, cohort_id)
        select v_slot_id, rc.cohort_id
        from public.appointment_availability_rule_cohorts rc
        where rc.rule_id = v_rule.id
        on conflict do nothing;
        v_created := v_created + 1;
      end if;
    end loop;

    update public.appointment_availability_rules
    set last_generated_through = v_horizon, updated_at = now()
    where id = v_rule.id;
  end loop;

  return v_created;
end;
$$;

create or replace function public.expire_appointment_slots()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  if auth.uid() is not null and not public.is_admin() then
    raise exception 'solo un administrador o scheduler puede expirar espacios';
  end if;
  update public.appointment_slots
  set status = 'expired', updated_at = now()
  where status = 'available' and starts_at < now() + interval '24 hours';
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- Genera una notificación por participante y una por cada administrador activo.
-- Por defecto evalúa el mes calendario anterior, ya completamente cerrado.
create or replace function public.create_monthly_mentoring_notifications(
  p_month date default ((date_trunc('month', now() at time zone 'America/Mexico_City') - interval '1 month')::date)
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_month_start date := date_trunc('month', p_month)::date;
  v_month_end date := (date_trunc('month', p_month) + interval '1 month')::date;
  v_inserted integer := 0;
  v_count integer;
begin
  if auth.uid() is not null and not public.is_admin() then
    raise exception 'solo un administrador o scheduler puede generar alertas';
  end if;

  with non_compliant as (
    select u.id, u.full_name
    from public.users u
    where u.role = 'participant' and u.is_active = true and u.cohort_id is not null
      and not exists (
        select 1 from public.mentoring_compliance_exempt_cohorts ec
        where ec.cohort_id = u.cohort_id
      )
      and not exists (
        select 1
        from public.appointments a
        join public.appointment_types t on t.id = a.appointment_type_id
        where a.participant_id = u.id
          and a.status = 'completed'
          and t.counts_for_monthly_mentoring = true
          and (a.starts_at at time zone 'America/Mexico_City')::date >= v_month_start
          and (a.starts_at at time zone 'America/Mexico_City')::date < v_month_end
      )
  )
  insert into public.internal_notifications (
    recipient_id, type, title, body, related_entity_type,
    related_entity_id, deduplication_key
  )
  select n.id, 'monthly_mentoring_missing', 'Mentoría mensual pendiente',
    'No se registró una mentoría completada durante ' || to_char(v_month_start, 'YYYY-MM') || '.',
    'user', n.id,
    'monthly-mentoring:' || to_char(v_month_start, 'YYYY-MM') || ':participant'
  from non_compliant n
  on conflict do nothing;
  get diagnostics v_count = row_count;
  v_inserted := v_inserted + v_count;

  with non_compliant as (
    select u.id, u.full_name
    from public.users u
    where u.role = 'participant' and u.is_active = true and u.cohort_id is not null
      and not exists (select 1 from public.mentoring_compliance_exempt_cohorts ec where ec.cohort_id = u.cohort_id)
      and not exists (
        select 1 from public.appointments a
        join public.appointment_types t on t.id = a.appointment_type_id
        where a.participant_id = u.id and a.status = 'completed'
          and t.counts_for_monthly_mentoring = true
          and (a.starts_at at time zone 'America/Mexico_City')::date >= v_month_start
          and (a.starts_at at time zone 'America/Mexico_City')::date < v_month_end
      )
  )
  insert into public.internal_notifications (
    recipient_id, type, title, body, related_entity_type,
    related_entity_id, deduplication_key
  )
  select admin.id, 'participant_monthly_mentoring_missing',
    'Participante sin mentoría mensual',
    n.full_name || ' no tiene una mentoría completada durante ' || to_char(v_month_start, 'YYYY-MM') || '.',
    'user', n.id,
    'monthly-mentoring:' || to_char(v_month_start, 'YYYY-MM') || ':participant:' || n.id::text
  from non_compliant n
  cross join public.users admin
  where admin.role = 'admin' and admin.is_active = true
  on conflict do nothing;
  get diagnostics v_count = row_count;
  v_inserted := v_inserted + v_count;

  return v_inserted;
end;
$$;

revoke all on function public.generate_appointment_slots(integer) from public;
revoke all on function public.expire_appointment_slots() from public;
revoke all on function public.create_monthly_mentoring_notifications(date) from public;
grant execute on function public.generate_appointment_slots(integer) to authenticated;
grant execute on function public.expire_appointment_slots() to authenticated;
grant execute on function public.create_monthly_mentoring_notifications(date) to authenticated;
