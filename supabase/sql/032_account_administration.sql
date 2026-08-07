-- =============================================================================
-- 032_account_administration.sql — Administración de cuentas sin escalamiento
-- =============================================================================

-- Una cuenta nunca puede cambiar su propio rol/estado a través de PostgREST.
revoke insert, update, delete on public.users from authenticated;
grant select on public.users to authenticated;
grant update (full_name) on public.users to authenticated;

drop policy if exists "users_update_own" on public.users;
create policy "users_update_own" on public.users for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- La modificación administrativa se centraliza en una RPC auditada. Un admin
-- sólo administra usuario/test; super_admin administra todos los roles.
create or replace function public.update_managed_user(
  p_user_id uuid,
  p_role text default null,
  p_is_active boolean default null
)
returns void language plpgsql security definer set search_path = public as $$
declare v_target public.users%rowtype;
begin
  if not public.is_admin() then raise exception 'solo personal administrativo puede gestionar cuentas'; end if;
  select * into v_target from public.users where id = p_user_id for update;
  if not found then raise exception 'cuenta inexistente'; end if;
  if p_role is null and p_is_active is null then raise exception 'no hay cambios solicitados'; end if;
  if p_role is not null and p_role not in ('super_admin', 'admin', 'psicologa', 'usuario', 'test') then
    raise exception 'rol inválido';
  end if;
  if not public.is_super_admin() then
    if v_target.role not in ('usuario', 'test') or (p_role is not null and p_role not in ('usuario', 'test')) then
      raise exception 'un admin sólo puede gestionar cuentas usuario o test';
    end if;
  end if;
  update public.users set
    role = coalesce(p_role, role),
    is_active = coalesce(p_is_active, is_active)
  where id = p_user_id;
  insert into public.appointment_audit_events (actor_id, action, entity_type, entity_id, request_metadata)
  values (auth.uid(), 'manage_account', 'users', p_user_id,
    jsonb_strip_nulls(jsonb_build_object('role', p_role, 'isActive', p_is_active)));
end;
$$;

revoke all on function public.update_managed_user(uuid, text, boolean) from public;
grant execute on function public.update_managed_user(uuid, text, boolean) to authenticated;

-- Las invitaciones conservan sólo los roles permitidos para el alta autónoma.
drop function if exists public.get_invitation_by_token(text);
create or replace function public.get_invitation_by_token(p_token text)
returns table (
  id uuid, token text, cohort_id uuid, created_by uuid, is_active boolean,
  created_at timestamptz, intended_role text
) language sql security definer set search_path = public stable as $$
  select i.id, i.token, i.cohort_id, i.created_by, i.is_active, i.created_at, i.intended_role
  from public.invitations i where i.token = p_token and i.is_active = true;
$$;
revoke all on function public.get_invitation_by_token(text) from public;
grant execute on function public.get_invitation_by_token(text) to anon, authenticated;

-- Las políticas administrativas existentes heredan is_admin(), que incluye a
-- super_admin. Se mantienen las invitaciones de usuario/test sin exponer tokens.
