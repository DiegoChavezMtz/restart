-- =============================================================================
-- 037_list_assigned_psychological_cases.sql — Bandeja clínica mínima auditada
-- =============================================================================

create or replace function public.list_assigned_psychological_cases()
returns table (
  id uuid,
  participant_id uuid,
  participant_name text,
  title text,
  status text,
  updated_at timestamptz
)
language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role(array['psicologa', 'super_admin']) then
    raise exception 'solo psicóloga asignada o super_admin puede consultar casos clínicos';
  end if;
  insert into public.appointment_audit_events (actor_id, action, entity_type, entity_id)
  values (auth.uid(), 'list_assigned_sensitive_cases', 'participant_cases', null);
  return query
    select c.id, c.participant_id, u.full_name, c.title, c.status, c.updated_at
    from public.participant_cases c
    join public.users u on u.id = c.participant_id
    where c.is_sensitive = true
      and (public.is_super_admin() or exists (
        select 1 from public.participant_case_psicologas cp
        where cp.case_id = c.id and cp.psicologa_id = auth.uid()
      ))
    order by c.updated_at desc;
end;
$$;

revoke all on function public.list_assigned_psychological_cases() from public;
grant execute on function public.list_assigned_psychological_cases() to authenticated;
