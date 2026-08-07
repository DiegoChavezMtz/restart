-- =============================================================================
-- 021_appointment_rls.sql — Endurecimiento de permisos y datos sensibles
-- =============================================================================

-- Policies creadas por este script se limpian también para que sea re-ejecutable.
do $$
declare
  v_item text;
  v_parts text[];
begin
  foreach v_item in array array[
    'participant_cases.participant_cases_non_sensitive_select',
    'participant_case_admins.case_admins_owner_select',
    'participant_case_appointments.case_appointments_non_sensitive_select',
    'participant_case_appointments.case_appointments_owner_insert',
    'participant_case_appointments.case_appointments_owner_delete',
    'appointment_notes.appointment_notes_owner_insert',
    'appointment_notes.appointment_notes_owner_update',
    'appointment_notes.appointment_notes_owner_delete',
    'appointment_goals.appointment_goals_owner_insert',
    'appointment_goals.appointment_goals_owner_update',
    'appointment_goals.appointment_goals_owner_delete',
    'appointment_commitments.appointment_commitments_owner_insert',
    'appointment_commitments.appointment_commitments_owner_update',
    'appointment_commitments.appointment_commitments_owner_delete',
    'appointment_form_instances.appointment_form_instances_owner_insert',
    'appointment_form_instances.appointment_form_instances_owner_update',
    'appointment_form_instances.appointment_form_instances_owner_delete',
    'appointment_form_question_snapshots.appointment_form_snapshots_owner_insert',
    'appointment_form_question_snapshots.appointment_form_snapshots_owner_update',
    'appointment_form_question_snapshots.appointment_form_snapshots_owner_delete',
    'appointment_form_answers.appointment_form_answers_owner_insert',
    'appointment_form_answers.appointment_form_answers_owner_update',
    'appointment_form_answers.appointment_form_answers_owner_delete'
  ] loop
    v_parts := string_to_array(v_item, '.');
    execute format('drop policy if exists %I on public.%I', v_parts[2], v_parts[1]);
  end loop;
end;
$$;

create or replace function public.is_sensitive_appointment(p_appointment_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.appointments a
    join public.appointment_types t on t.id = a.appointment_type_id
    where a.id = p_appointment_id and t.is_sensitive = true
  ) or exists (
    select 1
    from public.participant_case_appointments ca
    join public.participant_cases c on c.id = ca.case_id
    where ca.appointment_id = p_appointment_id and c.is_sensitive = true
  );
$$;

create or replace function public.can_read_appointment_header(p_appointment_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.is_admin() and exists (
    select 1 from public.appointments a
    where a.id = p_appointment_id
      and (
        not public.is_sensitive_appointment(a.id)
        or a.mentor_id = auth.uid()
        or exists (
          select 1
          from public.participant_case_appointments ca
          join public.participant_cases c on c.id = ca.case_id
          where ca.appointment_id = a.id
            and (c.owner_id = auth.uid() or exists (
              select 1 from public.participant_case_admins x
              where x.case_id = c.id and x.admin_id = auth.uid()
            ))
        )
      )
  );
$$;

-- Una plantilla interna jamás puede llegar al flujo del participante, aunque
-- alguien cree por error una asignación y la publique.
create or replace function public.is_form_visible_to_participant(p_form_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.forms f
    join public.form_assignments fa on fa.form_id = f.id
    where f.id = p_form_id
      and f.purpose = 'participant'
      and f.status = 'published'
      and (
        (fa.target_type = 'user' and fa.target_id = auth.uid())
        or (fa.target_type = 'cohort' and fa.target_id in (
          select cohort_id from public.users where id = auth.uid()
        ))
      )
  );
$$;

-- Los headers sensibles siguen visibles para sus autorizados. El contenido del
-- expediente se obtiene exclusivamente mediante read_sensitive_participant_case (022).
drop policy if exists appointments_admin_select on public.appointments;
create policy appointments_admin_select on public.appointments
  for select to authenticated using (public.can_read_appointment_header(id));

drop policy if exists appointment_history_admin_select on public.appointment_status_history;
create policy appointment_history_admin_select on public.appointment_status_history
  for select to authenticated using (public.can_read_appointment_header(appointment_id));

drop policy if exists appointment_tag_map_admin_select on public.appointment_tag_map;
create policy appointment_tag_map_admin_select on public.appointment_tag_map
  for select to authenticated using (public.can_read_appointment_header(appointment_id));

drop policy if exists appointment_types_participant_select on public.appointment_types;
create policy appointment_types_participant_select
  on public.appointment_types for select to authenticated
  using (
    is_active = true
    or exists (
      select 1 from public.appointments a
      where a.appointment_type_id = appointment_types.id
        and a.participant_id = auth.uid()
    )
  );

-- SELECT directo solo para expedientes no sensibles. Los sensibles pasan por RPC auditada.
drop policy if exists participant_cases_authorized_select on public.participant_cases;
create policy participant_cases_non_sensitive_select on public.participant_cases
  for select to authenticated using (public.is_admin() and is_sensitive = false);

drop policy if exists case_admins_authorized_select on public.participant_case_admins;
drop policy if exists case_admins_owner_select on public.participant_case_admins;
create policy case_admins_owner_select on public.participant_case_admins
  for select to authenticated using (exists (
    select 1 from public.participant_cases c
    where c.id = case_id and c.is_sensitive = false and public.is_admin()
  ));

drop policy if exists case_appointments_authorized_select on public.participant_case_appointments;
drop policy if exists case_appointments_non_sensitive_select on public.participant_case_appointments;
create policy case_appointments_non_sensitive_select on public.participant_case_appointments
  for select to authenticated using (exists (
    select 1 from public.participant_cases c
    where c.id = case_id and c.is_sensitive = false and public.is_admin()
  ));

drop policy if exists case_appointments_owner_all on public.participant_case_appointments;
create policy case_appointments_owner_insert on public.participant_case_appointments
  for insert to authenticated with check (public.is_case_owner(case_id));
create policy case_appointments_owner_delete on public.participant_case_appointments
  for delete to authenticated using (public.is_case_owner(case_id));

-- El contenido sensible tampoco se expone por SELECT directo. Las policies de
-- escritura del mentor siguen usando helpers SECURITY DEFINER.
create or replace function public.can_read_appointment_follow_up(p_appointment_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.is_admin() and not public.is_sensitive_appointment(p_appointment_id);
$$;

create or replace function public.is_appointment_form_owner(p_form_instance_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.appointment_form_instances i
    join public.appointments a on a.id = i.appointment_id
    where i.id = p_form_instance_id
      and a.mentor_id = auth.uid()
      and public.is_admin()
  );
$$;

-- Sustituye FOR ALL (que también concede SELECT) por policies DML explícitas.
drop policy if exists appointment_notes_owner_all on public.appointment_notes;
create policy appointment_notes_owner_insert on public.appointment_notes
  for insert to authenticated with check (
    public.is_appointment_owner(appointment_id) and created_by = auth.uid()
  );
create policy appointment_notes_owner_update on public.appointment_notes
  for update to authenticated using (public.is_appointment_owner(appointment_id))
  with check (public.is_appointment_owner(appointment_id) and created_by = auth.uid());
create policy appointment_notes_owner_delete on public.appointment_notes
  for delete to authenticated using (public.is_appointment_owner(appointment_id));

drop policy if exists appointment_goals_owner_all on public.appointment_goals;
create policy appointment_goals_owner_insert on public.appointment_goals
  for insert to authenticated with check (public.is_appointment_owner(appointment_id));
create policy appointment_goals_owner_update on public.appointment_goals
  for update to authenticated using (public.is_appointment_owner(appointment_id))
  with check (public.is_appointment_owner(appointment_id));
create policy appointment_goals_owner_delete on public.appointment_goals
  for delete to authenticated using (public.is_appointment_owner(appointment_id));

drop policy if exists appointment_commitments_owner_all on public.appointment_commitments;
create policy appointment_commitments_owner_insert on public.appointment_commitments
  for insert to authenticated with check (public.is_appointment_owner(appointment_id));
create policy appointment_commitments_owner_update on public.appointment_commitments
  for update to authenticated using (public.is_appointment_owner(appointment_id))
  with check (public.is_appointment_owner(appointment_id));
create policy appointment_commitments_owner_delete on public.appointment_commitments
  for delete to authenticated using (public.is_appointment_owner(appointment_id));

drop policy if exists appointment_form_instances_owner_all on public.appointment_form_instances;
create policy appointment_form_instances_owner_insert on public.appointment_form_instances
  for insert to authenticated with check (
    public.is_appointment_owner(appointment_id) and created_by = auth.uid()
  );
create policy appointment_form_instances_owner_update on public.appointment_form_instances
  for update to authenticated using (public.is_appointment_owner(appointment_id))
  with check (public.is_appointment_owner(appointment_id));
create policy appointment_form_instances_owner_delete on public.appointment_form_instances
  for delete to authenticated using (public.is_appointment_owner(appointment_id));

drop policy if exists appointment_form_snapshots_owner_all on public.appointment_form_question_snapshots;
create policy appointment_form_snapshots_owner_insert on public.appointment_form_question_snapshots
  for insert to authenticated with check (public.is_appointment_form_owner(form_instance_id));
create policy appointment_form_snapshots_owner_update on public.appointment_form_question_snapshots
  for update to authenticated using (public.is_appointment_form_owner(form_instance_id))
  with check (public.is_appointment_form_owner(form_instance_id));
create policy appointment_form_snapshots_owner_delete on public.appointment_form_question_snapshots
  for delete to authenticated using (public.is_appointment_form_owner(form_instance_id));

drop policy if exists appointment_form_answers_owner_all on public.appointment_form_answers;
create policy appointment_form_answers_owner_insert on public.appointment_form_answers
  for insert to authenticated with check (
    public.is_appointment_form_owner(form_instance_id) and last_edited_by = auth.uid()
  );
create policy appointment_form_answers_owner_update on public.appointment_form_answers
  for update to authenticated using (public.is_appointment_form_owner(form_instance_id))
  with check (public.is_appointment_form_owner(form_instance_id) and last_edited_by = auth.uid());
create policy appointment_form_answers_owner_delete on public.appointment_form_answers
  for delete to authenticated using (public.is_appointment_form_owner(form_instance_id));

-- Evita que un participante reactive su cuenta; solo admin cambia campos de seguridad.
create or replace function public.protect_user_security_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() = old.id and not public.is_admin() then
    if new.role is distinct from old.role
       or new.cohort_id is distinct from old.cohort_id
       or new.is_active is distinct from old.is_active then
      raise exception 'role, cohort_id and is_active cannot be changed by participants';
    end if;
  end if;
  return new;
end;
$$;

-- Los RPC SECURITY DEFINER son las únicas rutas de mutación de appointments.
revoke insert, update, delete on public.appointments from authenticated;
revoke insert, update, delete on public.appointment_status_history from authenticated;
