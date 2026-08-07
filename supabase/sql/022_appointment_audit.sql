-- =============================================================================
-- 022_appointment_audit.sql — Auditoría append-only y lectura sensible
-- =============================================================================

create table if not exists public.appointment_audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.users (id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  occurred_at timestamptz not null default now(),
  request_metadata jsonb not null default '{}'::jsonb
);

create index if not exists idx_appointment_audit_entity
  on public.appointment_audit_events (entity_type, entity_id, occurred_at desc);
create index if not exists idx_appointment_audit_actor
  on public.appointment_audit_events (actor_id, occurred_at desc);

alter table public.appointment_audit_events enable row level security;
grant select on public.appointment_audit_events to authenticated;

drop policy if exists appointment_audit_admin_select on public.appointment_audit_events;
create policy appointment_audit_admin_select on public.appointment_audit_events
  for select to authenticated using (public.is_admin());

create or replace function public.audit_appointment_mutation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  v_entity_id uuid;
begin
  begin
    v_entity_id := nullif(v_row ->> 'id', '')::uuid;
  exception when invalid_text_representation then
    v_entity_id := null;
  end;

  insert into public.appointment_audit_events
    (actor_id, action, entity_type, entity_id)
  values (auth.uid(), lower(tg_op), tg_table_name, v_entity_id);
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

-- Auditoría de creación/modificación/cancelación/notas/respuestas. Los triggers
-- registran quién y cuándo, sin copiar valores anteriores/nuevos.
do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'appointments', 'participant_cases', 'participant_case_admins',
    'participant_case_appointments', 'appointment_notes', 'appointment_goals',
    'appointment_commitments', 'appointment_form_instances',
    'appointment_form_question_snapshots', 'appointment_form_answers'
  ] loop
    execute format('drop trigger if exists audit_mutation on public.%I', v_table);
    execute format(
      'create trigger audit_mutation after insert or update or delete on public.%I '
      'for each row execute function public.audit_appointment_mutation()',
      v_table
    );
  end loop;
end;
$$;

-- Única ruta de lectura del contenido de un expediente sensible. Devuelve un
-- snapshot JSON y registra el acceso antes de responder.
create or replace function public.read_sensitive_participant_case(p_case_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_case public.participant_cases%rowtype;
  v_result jsonb;
begin
  select * into v_case from public.participant_cases c where c.id = p_case_id;
  if not found or not v_case.is_sensitive then
    raise exception 'expediente sensible inexistente';
  end if;
  if not public.is_case_authorized(p_case_id) then
    raise exception 'no autorizado para consultar el expediente';
  end if;

  insert into public.appointment_audit_events
    (actor_id, action, entity_type, entity_id)
  values (auth.uid(), 'read_sensitive', 'participant_cases', p_case_id);

  select jsonb_build_object(
    'case', to_jsonb(v_case),
    'authorizedAdmins', coalesce((
      select jsonb_agg(to_jsonb(ca) order by ca.granted_at)
      from public.participant_case_admins ca where ca.case_id = p_case_id
    ), '[]'::jsonb),
    'appointments', coalesce((
      select jsonb_agg(
        to_jsonb(a) || jsonb_build_object(
          'notes', coalesce((select jsonb_agg(to_jsonb(n) order by n.created_at)
            from public.appointment_notes n where n.appointment_id = a.id), '[]'::jsonb),
          'goals', coalesce((select jsonb_agg(to_jsonb(g) order by g.sort_order)
            from public.appointment_goals g where g.appointment_id = a.id), '[]'::jsonb),
          'commitments', coalesce((select jsonb_agg(to_jsonb(c) order by c.sort_order)
            from public.appointment_commitments c where c.appointment_id = a.id), '[]'::jsonb),
          'forms', coalesce((
            select jsonb_agg(
              to_jsonb(fi) || jsonb_build_object(
                'questions', coalesce((
                  select jsonb_agg(
                    to_jsonb(qs) || jsonb_build_object(
                      'answer', (select to_jsonb(fa) from public.appointment_form_answers fa
                        where fa.form_instance_id = fi.id and fa.question_snapshot_id = qs.id)
                    ) order by qs."order"
                  ) from public.appointment_form_question_snapshots qs
                  where qs.form_instance_id = fi.id
                ), '[]'::jsonb)
              ) order by fi.created_at
            ) from public.appointment_form_instances fi where fi.appointment_id = a.id
          ), '[]'::jsonb)
        ) order by a.starts_at
      )
      from public.participant_case_appointments ca
      join public.appointments a on a.id = ca.appointment_id
      where ca.case_id = p_case_id
    ), '[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$$;

revoke all on function public.read_sensitive_participant_case(uuid) from public;
grant execute on function public.read_sensitive_participant_case(uuid) to authenticated;

-- Transferencia explícita de propiedad; funciona también cuando el expediente
-- sensible no tiene SELECT directo y queda cubierta por el trigger de auditoría.
create or replace function public.transfer_participant_case_owner(
  p_case_id uuid,
  p_new_owner_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current_owner uuid;
begin
  select c.owner_id into v_current_owner
  from public.participant_cases c where c.id = p_case_id for update;
  if not found then
    raise exception 'expediente inexistente';
  end if;
  if v_current_owner <> auth.uid() or not public.is_admin() then
    raise exception 'solo el propietario actual puede transferir el expediente';
  end if;
  if not exists (
    select 1 from public.users u
    where u.id = p_new_owner_id and u.role = 'admin' and u.is_active = true
  ) then
    raise exception 'el nuevo propietario debe ser un administrador activo';
  end if;

  update public.participant_cases
  set owner_id = p_new_owner_id, updated_at = now()
  where id = p_case_id;
end;
$$;

revoke all on function public.transfer_participant_case_owner(uuid, uuid) from public;
grant execute on function public.transfer_participant_case_owner(uuid, uuid) to authenticated;

-- Escrituras owner-only que siguen funcionando para expedientes sensibles, cuyo
-- contenido deliberadamente no tiene SELECT directo por RLS.
create or replace function public.save_appointment_note(
  p_appointment_id uuid,
  p_note_id uuid,
  p_content text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare v_id uuid;
begin
  if not public.is_appointment_owner(p_appointment_id) then
    raise exception 'solo el mentor propietario puede editar notas';
  end if;
  if p_note_id is null then
    insert into public.appointment_notes (appointment_id, content, created_by)
    values (p_appointment_id, p_content, auth.uid()) returning id into v_id;
  else
    update public.appointment_notes
    set content = p_content, updated_at = now()
    where id = p_note_id and appointment_id = p_appointment_id
    returning id into v_id;
    if v_id is null then raise exception 'nota inexistente'; end if;
  end if;
  return v_id;
end;
$$;

create or replace function public.save_appointment_goal(
  p_appointment_id uuid,
  p_goal_id uuid,
  p_description text,
  p_sort_order integer default 0
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare v_id uuid;
begin
  if not public.is_appointment_owner(p_appointment_id) then
    raise exception 'solo el mentor propietario puede editar objetivos';
  end if;
  if p_goal_id is null then
    insert into public.appointment_goals (appointment_id, description, sort_order)
    values (p_appointment_id, p_description, p_sort_order) returning id into v_id;
  else
    update public.appointment_goals
    set description = p_description, sort_order = p_sort_order, updated_at = now()
    where id = p_goal_id and appointment_id = p_appointment_id
    returning id into v_id;
    if v_id is null then raise exception 'objetivo inexistente'; end if;
  end if;
  return v_id;
end;
$$;

create or replace function public.save_appointment_commitment(
  p_appointment_id uuid,
  p_commitment_id uuid,
  p_description text,
  p_status text default 'pending',
  p_sort_order integer default 0
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare v_id uuid;
begin
  if not public.is_appointment_owner(p_appointment_id) then
    raise exception 'solo el mentor propietario puede editar compromisos';
  end if;
  if p_status not in ('pending', 'completed') then
    raise exception 'estado de compromiso inválido';
  end if;
  if p_commitment_id is null then
    insert into public.appointment_commitments
      (appointment_id, description, status, sort_order, completed_at)
    values (
      p_appointment_id, p_description, p_status, p_sort_order,
      case when p_status = 'completed' then now() else null end
    ) returning id into v_id;
  else
    update public.appointment_commitments
    set description = p_description,
        status = p_status,
        sort_order = p_sort_order,
        completed_at = case when p_status = 'completed' then coalesce(completed_at, now()) else null end,
        updated_at = now()
    where id = p_commitment_id and appointment_id = p_appointment_id
    returning id into v_id;
    if v_id is null then raise exception 'compromiso inexistente'; end if;
  end if;
  return v_id;
end;
$$;

create or replace function public.save_appointment_form_answer(
  p_form_instance_id uuid,
  p_question_snapshot_id uuid,
  p_value jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare v_id uuid;
begin
  if not public.is_appointment_form_owner(p_form_instance_id) then
    raise exception 'solo el mentor propietario puede editar respuestas';
  end if;
  if not exists (
    select 1 from public.appointment_form_question_snapshots q
    where q.id = p_question_snapshot_id and q.form_instance_id = p_form_instance_id
  ) then
    raise exception 'la pregunta no pertenece a la instancia';
  end if;

  insert into public.appointment_form_answers
    (form_instance_id, question_snapshot_id, value, last_edited_by)
  values (p_form_instance_id, p_question_snapshot_id, p_value, auth.uid())
  on conflict (form_instance_id, question_snapshot_id) do update
    set value = excluded.value, last_edited_by = auth.uid(), updated_at = now()
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.set_appointment_form_instance_status(
  p_form_instance_id uuid,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_appointment_form_owner(p_form_instance_id) then
    raise exception 'solo el mentor propietario puede cerrar el formulario';
  end if;
  if p_status not in ('in_progress', 'completed') then
    raise exception 'estado de formulario inválido';
  end if;
  update public.appointment_form_instances
  set status = p_status,
      completed_at = case when p_status = 'completed' then coalesce(completed_at, now()) else null end,
      updated_at = now()
  where id = p_form_instance_id;
end;
$$;

revoke all on function public.save_appointment_note(uuid, uuid, text) from public;
revoke all on function public.save_appointment_goal(uuid, uuid, text, integer) from public;
revoke all on function public.save_appointment_commitment(uuid, uuid, text, text, integer) from public;
revoke all on function public.save_appointment_form_answer(uuid, uuid, jsonb) from public;
revoke all on function public.set_appointment_form_instance_status(uuid, text) from public;
grant execute on function public.save_appointment_note(uuid, uuid, text) to authenticated;
grant execute on function public.save_appointment_goal(uuid, uuid, text, integer) to authenticated;
grant execute on function public.save_appointment_commitment(uuid, uuid, text, text, integer) to authenticated;
grant execute on function public.save_appointment_form_answer(uuid, uuid, jsonb) to authenticated;
grant execute on function public.set_appointment_form_instance_status(uuid, text) to authenticated;
