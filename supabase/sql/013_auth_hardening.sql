-- Idempotent: safe to re-run.
-- Closes privilege escalation through user-controlled Auth metadata and
-- prevents participants from changing their role or cohort directly.

-- A participant must never create a hand-crafted public profile. The
-- SECURITY DEFINER registration trigger is the only participant insert path.
drop policy if exists "users_insert_own" on public.users;

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

  -- Auth users created without an invitation receive no public profile.
  -- This preserves a safe, explicit SQL bootstrap path for the first admin
  -- without trusting role metadata supplied by anonymous sign-up clients.
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
