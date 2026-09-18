-- =============================================================================
-- 049_team_invitations.sql — Altas de personal sin cohorte
-- =============================================================================

alter table public.invitations alter column cohort_id drop not null;

alter table public.invitations drop constraint if exists invitations_intended_role_check;
alter table public.invitations add constraint invitations_intended_role_check
  check (intended_role in ('admin', 'psicologa', 'usuario', 'test'));

alter table public.invitations drop constraint if exists invitations_role_cohort_check;
alter table public.invitations add constraint invitations_role_cohort_check check (
  (intended_role in ('usuario', 'test') and cohort_id is not null)
  or (intended_role in ('admin', 'psicologa') and cohort_id is null)
);

create or replace function public.validate_team_invitation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.intended_role in ('admin', 'psicologa') then
    if not public.is_super_admin() then
      raise exception 'solo super_admin puede invitar miembros del equipo';
    end if;
    if new.cohort_id is not null then
      raise exception 'las invitaciones de equipo no deben tener cohorte';
    end if;
  elsif new.cohort_id is null then
    raise exception 'las invitaciones de usuario o test requieren cohorte';
  end if;

  -- Un admin normal tampoco puede modificar ni desactivar una invitación de equipo.
  if tg_op = 'UPDATE' and old.intended_role in ('admin', 'psicologa') and not public.is_super_admin() then
    raise exception 'solo super_admin puede gestionar invitaciones de equipo';
  end if;
  return new;
end;
$$;

drop trigger if exists validate_team_invitation on public.invitations;
create trigger validate_team_invitation
  before insert or update on public.invitations
  for each row execute function public.validate_team_invitation();

-- El token se bloquea dentro del mismo trigger que crea el perfil; así no se
-- puede reutilizar para crear una segunda cuenta.
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
    -- Se preserva el alta manual de bootstrap sin token, pero un token inválido
    -- o ya utilizado aborta el alta en Auth para evitar perfiles huérfanos.
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

  update public.invitations set is_active = false where id = v_invitation.id;
  return new;
end;
$$;
