-- =============================================================================
-- 028_roles_and_capabilities.sql — Roles, capacidades y altas seguras
-- =============================================================================
-- Fuente de verdad funcional: docs/ROLES_Y_PERMISOS.md.

-- Algunas instalaciones aún no aplicaron la base de citas (015), que añadió
-- esta columna. La transición de roles no debe depender de ese orden parcial.
alter table public.users
  add column if not exists is_active boolean not null default true;

alter table public.users drop constraint if exists users_role_check;
-- El CHECK anterior de instalaciones existentes sólo permite participant/admin.
-- Se reemplaza antes de migrar los valores históricos.
update public.users set role = 'usuario' where role = 'participant';
alter table public.users add constraint users_role_check
  check (role in ('super_admin', 'admin', 'psicologa', 'usuario', 'test'));

alter table public.invitations
  add column if not exists intended_role text not null default 'usuario';
alter table public.invitations drop constraint if exists invitations_intended_role_check;
alter table public.invitations add constraint invitations_intended_role_check
  check (intended_role in ('usuario', 'test'));

create table if not exists public.user_capabilities (
  user_id uuid not null references public.users (id) on delete cascade,
  capability text not null check (capability in (
    'manage_appointment_availability',
    'manage_non_sensitive_appointments',
    'manage_non_sensitive_internal_forms'
  )),
  granted_by uuid not null references public.users (id),
  granted_at timestamptz not null default now(),
  revoked_by uuid references public.users (id),
  revoked_at timestamptz,
  primary key (user_id, capability),
  check ((revoked_at is null) = (revoked_by is null))
);

alter table public.user_capabilities enable row level security;
grant select, insert, update, delete on public.user_capabilities to authenticated;

-- Helpers con SECURITY DEFINER para que las policies no dependan de la tabla
-- users y no introduzcan recursión RLS.
create or replace function public.has_role(p_roles text[])
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.users u
    where u.id = auth.uid() and u.is_active = true and u.role = any(p_roles)
  );
$$;

create or replace function public.is_super_admin()
returns boolean language sql security definer set search_path = public stable as $$
  select public.has_role(array['super_admin']);
$$;

-- Compatibilidad temporal para módulos aún no migrados: no concede acceso a
-- psicólogas; el refactor posterior usa helpers específicos de capacidad.
create or replace function public.is_admin()
returns boolean language sql security definer set search_path = public stable as $$
  select public.has_role(array['super_admin', 'admin']);
$$;

create or replace function public.is_staff()
returns boolean language sql security definer set search_path = public stable as $$
  select public.has_role(array['super_admin', 'admin', 'psicologa']);
$$;

create or replace function public.is_response_actor()
returns boolean language sql security definer set search_path = public stable as $$
  select public.has_role(array['usuario', 'test']);
$$;

create or replace function public.is_test_actor()
returns boolean language sql security definer set search_path = public stable as $$
  select public.has_role(array['test']);
$$;

create or replace function public.has_capability(p_capability text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.is_super_admin() or exists (
    select 1 from public.user_capabilities c
    join public.users u on u.id = c.user_id
    where c.user_id = auth.uid()
      and u.role = 'psicologa'
      and u.is_active = true
      and c.capability = p_capability
      and c.revoked_at is null
  );
$$;

create or replace function public.can_manage_users()
returns boolean language sql security definer set search_path = public stable as $$
  select public.is_admin();
$$;

create or replace function public.can_manage_forms()
returns boolean language sql security definer set search_path = public stable as $$
  select public.is_admin();
$$;

create or replace function public.can_view_analytics()
returns boolean language sql security definer set search_path = public stable as $$
  select public.is_admin();
$$;

create or replace function public.can_manage_attendance()
returns boolean language sql security definer set search_path = public stable as $$
  select public.is_admin();
$$;

create or replace function public.can_manage_appointments()
returns boolean language sql security definer set search_path = public stable as $$
  select public.is_admin() or public.has_capability('manage_non_sensitive_appointments');
$$;

create or replace function public.can_manage_appointment_availability()
returns boolean language sql security definer set search_path = public stable as $$
  select public.is_admin() or public.has_capability('manage_appointment_availability');
$$;

create or replace function public.can_manage_internal_forms()
returns boolean language sql security definer set search_path = public stable as $$
  select public.is_staff() or public.has_capability('manage_non_sensitive_internal_forms');
$$;

create or replace function public.validate_user_capability()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_super_admin() then
    raise exception 'solo super_admin puede administrar capacidades';
  end if;
  if not exists (
    select 1 from public.users u where u.id = new.user_id and u.role = 'psicologa'
  ) then
    raise exception 'las capacidades delegables sólo aplican a psicologas';
  end if;
  if tg_op = 'INSERT' then
    new.granted_by := auth.uid();
  elsif new.revoked_at is not null and old.revoked_at is null then
    new.revoked_by := auth.uid();
    new.revoked_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists validate_user_capability on public.user_capabilities;
create trigger validate_user_capability
  before insert or update on public.user_capabilities
  for each row execute function public.validate_user_capability();

drop policy if exists user_capabilities_super_admin_all on public.user_capabilities;
create policy user_capabilities_super_admin_all on public.user_capabilities
  for all to authenticated using (public.is_super_admin()) with check (public.is_super_admin());
drop policy if exists user_capabilities_self_select on public.user_capabilities;
create policy user_capabilities_self_select on public.user_capabilities
  for select to authenticated using (user_id = auth.uid());

-- Registro por invitación: sólo usuario/test, nunca roles de personal.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invitation public.invitations%rowtype;
begin
  select * into v_invitation from public.invitations i
  where i.token = new.raw_user_meta_data ->> 'invitation_token' and i.is_active = true;
  if not found then return new; end if;

  insert into public.users (id, email, full_name, role, cohort_id)
  values (
    new.id, new.email, coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    v_invitation.intended_role, v_invitation.cohort_id
  ) on conflict (id) do nothing;
  return new;
end;
$$;





