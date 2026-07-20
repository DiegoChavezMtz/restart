-- Idempotent: safe to re-run.

-- Profiles are created only by the SECURITY DEFINER trigger below. Allowing
-- users to insert their own row would let them choose privileged fields.
drop policy if exists "users_insert_own" on public.users;

-- Auto-creates the public.users profile from a valid invitation. Security
-- sensitive fields are never trusted from client-controlled metadata:
-- role is always participant and cohort_id is resolved from the invitation.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  resolved_cohort_id uuid;
begin
  select i.cohort_id into resolved_cohort_id
  from public.invitations i
  where i.token = new.raw_user_meta_data ->> 'invitation_token'
    and i.is_active = true;

  -- Auth users created without an invitation (for example the first admin
  -- created from the Supabase dashboard) receive no public profile. An
  -- operator can bootstrap that admin explicitly with trusted SQL.
  if resolved_cohort_id is null then
    return new;
  end if;

  insert into public.users (id, email, full_name, role, cohort_id)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    'participant',
    resolved_cohort_id
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Participants may edit profile data, but can never promote themselves or
-- move to another cohort. Admin changes made from trusted SQL remain valid.
create or replace function public.protect_user_security_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() = old.id and not public.is_admin() then
    if new.role is distinct from old.role or new.cohort_id is distinct from old.cohort_id then
      raise exception 'role and cohort_id cannot be changed by participants';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_user_security_fields on public.users;
create trigger protect_user_security_fields
  before update on public.users
  for each row execute function public.protect_user_security_fields();

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
