-- =============================================================================
-- 033_capability_policy_corrections.sql — Sin permisos implícitos para psicólogas
-- =============================================================================

create or replace function public.can_manage_internal_forms()
returns boolean language sql security definer set search_path = public stable as $$
  select public.is_admin() or public.has_capability('manage_non_sensitive_internal_forms');
$$;

create or replace function public.can_manage_psychological_internal_forms()
returns boolean language sql security definer set search_path = public stable as $$
  select public.is_admin() or public.has_role(array['psicologa']);
$$;

drop policy if exists availability_rule_cohorts_owner_all on public.appointment_availability_rule_cohorts;
create policy availability_rule_cohorts_owner_all on public.appointment_availability_rule_cohorts for all to authenticated
  using (exists (select 1 from public.appointment_availability_rules r where r.id = rule_id and r.mentor_id = auth.uid() and public.can_manage_appointment_availability()))
  with check (exists (select 1 from public.appointment_availability_rules r where r.id = rule_id and r.mentor_id = auth.uid() and public.can_manage_appointment_availability()));

drop policy if exists availability_exceptions_owner_all on public.appointment_availability_exceptions;
create policy availability_exceptions_owner_all on public.appointment_availability_exceptions for all to authenticated
  using (exists (select 1 from public.appointment_availability_rules r where r.id = rule_id and r.mentor_id = auth.uid() and public.can_manage_appointment_availability()))
  with check (exists (select 1 from public.appointment_availability_rules r where r.id = rule_id and r.mentor_id = auth.uid() and public.can_manage_appointment_availability()));

drop policy if exists appointment_slot_cohorts_owner_all on public.appointment_slot_cohorts;
create policy appointment_slot_cohorts_owner_all on public.appointment_slot_cohorts for all to authenticated
  using (exists (select 1 from public.appointment_slots s where s.id = slot_id and s.mentor_id = auth.uid() and public.can_manage_appointment_availability()))
  with check (exists (select 1 from public.appointment_slots s where s.id = slot_id and s.mentor_id = auth.uid() and public.can_manage_appointment_availability()));
