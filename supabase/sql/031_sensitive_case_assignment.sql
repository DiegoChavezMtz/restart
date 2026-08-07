-- =============================================================================
-- 031_sensitive_case_assignment.sql — Asignación clínica y acceso auditado
-- =============================================================================

create table if not exists public.participant_case_psicologas (
  case_id uuid not null references public.participant_cases (id) on delete cascade,
  psicologa_id uuid not null references public.users (id),
  assigned_by uuid not null references public.users (id),
  assigned_at timestamptz not null default now(),
  primary key (case_id, psicologa_id)
);

create index if not exists idx_participant_case_psicologas_psicologa
  on public.participant_case_psicologas (psicologa_id, assigned_at desc);

alter table public.participant_case_psicologas enable row level security;
grant select on public.participant_case_psicologas to authenticated;

create or replace function public.validate_case_participants()
returns trigger language plpgsql set search_path = public as $$
begin
  if not exists (select 1 from public.users u where u.id = new.participant_id and u.role in ('usuario', 'test') and u.is_active) then
    raise exception 'el expediente requiere un usuario activo';
  end if;
  if not exists (select 1 from public.users u where u.id = new.owner_id and u.role in ('super_admin', 'admin') and u.is_active) then
    raise exception 'el propietario debe ser personal administrativo activo';
  end if;
  return new;
end;
$$;

create or replace function public.is_case_authorized(p_case_id uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select exists (
    select 1 from public.participant_cases c
    where c.id = p_case_id and (
      public.is_super_admin()
      or (not c.is_sensitive and public.is_admin())
      or exists (select 1 from public.participant_case_psicologas cp where cp.case_id = c.id and cp.psicologa_id = auth.uid())
    )
  );
$$;

create or replace function public.is_case_owner(p_case_id uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select public.is_admin() and exists (select 1 from public.participant_cases c where c.id = p_case_id and c.owner_id = auth.uid());
$$;

create or replace function public.can_read_appointment_header(p_appointment_id uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select exists (
    select 1 from public.appointments a where a.id = p_appointment_id and (
      public.is_super_admin()
      or (not public.is_sensitive_appointment(a.id) and public.is_admin())
      or public.is_appointment_owner(a.id)
      or exists (
        select 1 from public.participant_case_appointments ca
        join public.participant_case_psicologas cp on cp.case_id = ca.case_id
        where ca.appointment_id = a.id and cp.psicologa_id = auth.uid()
      )
    )
  );
$$;

create or replace function public.can_read_appointment_follow_up(p_appointment_id uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select exists (
    select 1 from public.appointments a where a.id = p_appointment_id and (
      public.is_super_admin()
      or (not public.is_sensitive_appointment(a.id) and public.is_admin())
      or public.is_appointment_owner(a.id)
      or exists (
        select 1 from public.participant_case_appointments ca
        join public.participant_case_psicologas cp on cp.case_id = ca.case_id
        where ca.appointment_id = a.id and cp.psicologa_id = auth.uid()
      )
    )
  );
$$;

create or replace function public.assign_psicologa_to_case(p_case_id uuid, p_psicologa_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'solo personal administrativo puede asignar casos'; end if;
  perform 1 from public.participant_cases where id = p_case_id for update;
  if not found then raise exception 'expediente inexistente'; end if;
  if not exists (select 1 from public.users u where u.id = p_psicologa_id and u.role = 'psicologa' and u.is_active) then
    raise exception 'la persona asignada debe ser una psicóloga activa';
  end if;
  insert into public.participant_case_psicologas (case_id, psicologa_id, assigned_by)
  values (p_case_id, p_psicologa_id, auth.uid()) on conflict (case_id, psicologa_id) do nothing;
  insert into public.appointment_audit_events (actor_id, action, entity_type, entity_id)
  values (auth.uid(), 'assign_psicologa', 'participant_cases', p_case_id);
end;
$$;

create or replace function public.unassign_psicologa_from_case(p_case_id uuid, p_psicologa_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'solo personal administrativo puede retirar asignaciones'; end if;
  delete from public.participant_case_psicologas where case_id = p_case_id and psicologa_id = p_psicologa_id;
  insert into public.appointment_audit_events (actor_id, action, entity_type, entity_id)
  values (auth.uid(), 'unassign_psicologa', 'participant_cases', p_case_id);
end;
$$;

revoke all on function public.assign_psicologa_to_case(uuid, uuid) from public;
revoke all on function public.unassign_psicologa_from_case(uuid, uuid) from public;
grant execute on function public.assign_psicologa_to_case(uuid, uuid) to authenticated;
grant execute on function public.unassign_psicologa_from_case(uuid, uuid) to authenticated;

drop policy if exists participant_cases_non_sensitive_select on public.participant_cases;
drop policy if exists participant_cases_authorized_select on public.participant_cases;
create policy participant_cases_non_sensitive_select on public.participant_cases for select to authenticated
  using (not is_sensitive and public.is_admin());
drop policy if exists participant_cases_admin_insert on public.participant_cases;
create policy participant_cases_admin_insert on public.participant_cases for insert to authenticated
  with check (public.is_admin() and created_by = auth.uid());
drop policy if exists participant_cases_owner_update on public.participant_cases;
create policy participant_cases_owner_update on public.participant_cases for update to authenticated
  using (public.is_case_owner(id)) with check (public.is_admin());
drop policy if exists participant_cases_owner_delete on public.participant_cases;
create policy participant_cases_owner_delete on public.participant_cases for delete to authenticated using (public.is_case_owner(id));

create policy case_psicologas_admin_select on public.participant_case_psicologas for select to authenticated
  using (public.is_admin());

-- Esta función conserva la única ruta de lectura sensible y ahora incluye la
-- asignación clínica explícita en el snapshot y la auditoría.
create or replace function public.read_sensitive_participant_case(p_case_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_case public.participant_cases%rowtype; v_result jsonb;
begin
  select * into v_case from public.participant_cases c where c.id = p_case_id;
  if not found or not v_case.is_sensitive then raise exception 'expediente sensible inexistente'; end if;
  if not public.is_case_authorized(p_case_id) then raise exception 'no autorizado para consultar el expediente'; end if;
  insert into public.appointment_audit_events (actor_id, action, entity_type, entity_id)
  values (auth.uid(), 'read_sensitive', 'participant_cases', p_case_id);
  select jsonb_build_object(
    'case', to_jsonb(v_case),
    'assignedPsychologists', coalesce((select jsonb_agg(to_jsonb(cp) order by cp.assigned_at) from public.participant_case_psicologas cp where cp.case_id = p_case_id), '[]'::jsonb),
    'appointments', coalesce((select jsonb_agg(to_jsonb(a) order by a.starts_at) from public.participant_case_appointments ca join public.appointments a on a.id = ca.appointment_id where ca.case_id = p_case_id), '[]'::jsonb)
  ) into v_result;
  return v_result;
end;
$$;

-- Las notas y formularios internos se rigen por el mentor asignado; la lectura
-- de contenido sensible sigue pasando por la función auditada anterior.
create or replace function public.is_appointment_form_owner(p_form_instance_id uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select exists (select 1 from public.appointment_form_instances i join public.appointments a on a.id = i.appointment_id where i.id = p_form_instance_id and public.is_appointment_owner(a.id));
$$;
