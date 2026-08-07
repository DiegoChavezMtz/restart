-- =============================================================================
-- 035_protect_last_super_admin.sql — Evita perder la autoridad de arranque
-- =============================================================================

create or replace function public.update_managed_user(
  p_user_id uuid,
  p_role text default null,
  p_is_active boolean default null
)
returns void language plpgsql security definer set search_path = public as $$
declare v_target public.users%rowtype; v_active_super_admins integer;
begin
  if not public.is_admin() then raise exception 'solo personal administrativo puede gestionar cuentas'; end if;
  select * into v_target from public.users where id = p_user_id for update;
  if not found then raise exception 'cuenta inexistente'; end if;
  if p_role is null and p_is_active is null then raise exception 'no hay cambios solicitados'; end if;
  if p_role is not null and p_role not in ('super_admin', 'admin', 'psicologa', 'usuario', 'test') then raise exception 'rol inválido'; end if;
  if not public.is_super_admin() then
    if v_target.role not in ('usuario', 'test') or (p_role is not null and p_role not in ('usuario', 'test')) then
      raise exception 'un admin sólo puede gestionar cuentas usuario o test';
    end if;
  end if;
  if v_target.role = 'super_admin' and (coalesce(p_role, v_target.role) <> 'super_admin' or coalesce(p_is_active, v_target.is_active) = false) then
    select count(*) into v_active_super_admins from public.users where role = 'super_admin' and is_active = true;
    if v_active_super_admins <= 1 then raise exception 'no se puede desactivar ni degradar al último super_admin activo'; end if;
  end if;
  update public.users set role = coalesce(p_role, role), is_active = coalesce(p_is_active, is_active) where id = p_user_id;
  insert into public.appointment_audit_events (actor_id, action, entity_type, entity_id, request_metadata)
  values (auth.uid(), 'manage_account', 'users', p_user_id, jsonb_strip_nulls(jsonb_build_object('role', p_role, 'isActive', p_is_active)));
end;
$$;
