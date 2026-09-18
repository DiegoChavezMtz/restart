-- =============================================================================
-- 050_fix_team_invitation_consumption.sql
-- Permite que el trigger de registro consuma una invitación de equipo sin
-- relajar la regla de que sólo super_admin puede administrarlas.
-- =============================================================================

create or replace function public.validate_team_invitation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.intended_role in ('admin', 'psicologa') then
    if tg_op = 'INSERT' and not public.is_super_admin() then
      raise exception 'solo super_admin puede invitar miembros del equipo';
    end if;
    if new.cohort_id is not null then
      raise exception 'las invitaciones de equipo no deben tener cohorte';
    end if;
  elsif new.cohort_id is null then
    raise exception 'las invitaciones de usuario o test requieren cohorte';
  end if;

  if tg_op = 'UPDATE' and old.intended_role in ('admin', 'psicologa')
    and not public.is_super_admin()
    and current_setting('app.consume_team_invitation', true) is distinct from 'true' then
    raise exception 'solo super_admin puede gestionar invitaciones de equipo';
  end if;
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invitation public.invitations%rowtype;
begin
  select * into v_invitation
  from public.invitations i
  where i.token = new.raw_user_meta_data ->> 'invitation_token' and i.is_active = true
  for update;
  if not found then
    if new.raw_user_meta_data ->> 'invitation_token' is not null then
      raise exception 'la invitación es inválida o ya fue utilizada';
    end if;
    return new;
  end if;

  insert into public.users (id, email, full_name, role, cohort_id)
  values (
    new.id, new.email, coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    v_invitation.intended_role, v_invitation.cohort_id
  ) on conflict (id) do nothing;

  perform set_config('app.consume_team_invitation', 'true', true);
  update public.invitations set is_active = false where id = v_invitation.id;
  return new;
end;
$$;
