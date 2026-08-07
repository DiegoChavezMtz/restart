-- =============================================================================
-- 034_psychological_internal_forms.sql — Plantillas clínicas de psicólogas
-- =============================================================================

alter table public.forms add column if not exists is_psychological boolean not null default false;
alter table public.forms add constraint forms_psychological_internal_check
  check (not is_psychological or purpose = 'appointment_internal');

create or replace function public.can_manage_form_definition(p_form_id uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select exists (
    select 1 from public.forms f where f.id = p_form_id and (
      public.is_admin()
      or (f.purpose = 'appointment_internal' and f.is_psychological and f.created_by = auth.uid() and public.has_role(array['psicologa']))
      or (f.purpose = 'appointment_internal' and not f.is_psychological and f.created_by = auth.uid() and public.can_manage_internal_forms())
    )
  );
$$;

drop policy if exists forms_admin_select on public.forms;
create policy forms_admin_select on public.forms for select to authenticated using (
  public.is_admin() or (purpose = 'appointment_internal' and created_by = auth.uid() and public.has_role(array['psicologa']))
);
drop policy if exists forms_admin_insert on public.forms;
create policy forms_admin_insert on public.forms for insert to authenticated with check (
  (public.is_admin() and (purpose <> 'appointment_internal' or created_by = auth.uid()))
  or (purpose = 'appointment_internal' and is_psychological and created_by = auth.uid() and public.has_role(array['psicologa']))
  or (purpose = 'appointment_internal' and not is_psychological and created_by = auth.uid() and public.can_manage_internal_forms())
);
drop policy if exists forms_admin_update on public.forms;
create policy forms_admin_update on public.forms for update to authenticated
  using (public.can_manage_form_definition(id)) with check (public.can_manage_form_definition(id));
drop policy if exists forms_admin_delete on public.forms;
create policy forms_admin_delete on public.forms for delete to authenticated using (public.can_manage_form_definition(id));

drop policy if exists questions_admin_select on public.questions;
create policy questions_admin_select on public.questions for select to authenticated using (public.can_manage_form_definition(form_id));
drop policy if exists questions_admin_insert on public.questions;
create policy questions_admin_insert on public.questions for insert to authenticated with check (public.can_manage_form_definition(form_id));
drop policy if exists questions_admin_update on public.questions;
create policy questions_admin_update on public.questions for update to authenticated using (public.can_manage_form_definition(form_id)) with check (public.can_manage_form_definition(form_id));
drop policy if exists questions_admin_delete on public.questions;
create policy questions_admin_delete on public.questions for delete to authenticated using (public.can_manage_form_definition(form_id));

drop policy if exists form_skills_admin_select on public.form_skills;
create policy form_skills_admin_select on public.form_skills for select to authenticated using (public.can_manage_form_definition(form_id));
drop policy if exists form_skills_admin_write on public.form_skills;
create policy form_skills_admin_write on public.form_skills for all to authenticated using (public.can_manage_form_definition(form_id)) with check (public.can_manage_form_definition(form_id));
drop policy if exists question_skill_weights_admin_select on public.question_skill_weights;
create policy question_skill_weights_admin_select on public.question_skill_weights for select to authenticated using (exists (select 1 from public.questions q where q.id = question_id and public.can_manage_form_definition(q.form_id)));
drop policy if exists question_skill_weights_admin_write on public.question_skill_weights;
create policy question_skill_weights_admin_write on public.question_skill_weights for all to authenticated using (exists (select 1 from public.questions q where q.id = question_id and public.can_manage_form_definition(q.form_id))) with check (exists (select 1 from public.questions q where q.id = question_id and public.can_manage_form_definition(q.form_id)));
drop policy if exists question_option_branches_admin_select on public.question_option_branches;
create policy question_option_branches_admin_select on public.question_option_branches for select to authenticated using (exists (select 1 from public.questions q where q.id = question_id and public.can_manage_form_definition(q.form_id)));
drop policy if exists question_option_branches_admin_write on public.question_option_branches;
create policy question_option_branches_admin_write on public.question_option_branches for all to authenticated using (exists (select 1 from public.questions q where q.id = question_id and public.can_manage_form_definition(q.form_id))) with check (exists (select 1 from public.questions q where q.id = question_id and public.can_manage_form_definition(q.form_id)));

-- Índice operativo tras la migración participant -> usuario.
create index if not exists idx_users_active_usuarios_by_cohort
  on public.users (cohort_id, id) where role = 'usuario' and is_active = true;

create or replace function public.transfer_participant_case_owner(p_case_id uuid, p_new_owner_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'solo personal administrativo puede transferir expedientes'; end if;
  perform 1 from public.participant_cases where id = p_case_id for update;
  if not found then raise exception 'expediente inexistente'; end if;
  if not exists (select 1 from public.users u where u.id = p_new_owner_id and u.role in ('super_admin', 'admin') and u.is_active) then
    raise exception 'el nuevo propietario debe ser personal administrativo activo';
  end if;
  update public.participant_cases set owner_id = p_new_owner_id, updated_at = now() where id = p_case_id;
  insert into public.appointment_audit_events (actor_id, action, entity_type, entity_id)
  values (auth.uid(), 'transfer_case_owner', 'participant_cases', p_case_id);
end;
$$;
