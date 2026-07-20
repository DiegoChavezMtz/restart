-- Idempotent: safe to re-run.

create table if not exists public.invitations (
  id uuid primary key default gen_random_uuid(),
  token text not null unique default encode(gen_random_bytes(32), 'hex'),
  cohort_id uuid not null references public.cohorts (id) on delete cascade,
  created_by uuid not null references public.users (id) on delete restrict,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_invitations_cohort_id on public.invitations (cohort_id);

alter table public.invitations enable row level security;

grant select, insert, update, delete on public.invitations to authenticated;
-- Deliberately NOT granting select to anon: token lookup happens exclusively
-- through the SECURITY DEFINER RPC below, never via the generic PostgREST
-- table endpoint, so tokens can never be listed/enumerated by an anon client.

drop policy if exists "invitations_admin_all" on public.invitations;
create policy "invitations_admin_all" on public.invitations
  for all using (public.is_admin()) with check (public.is_admin());

-- Pre-auth token validation: a participant lands on /register?token=...
-- before any session exists. SECURITY DEFINER bypasses RLS for this single,
-- narrow, exact-match lookup; granted to anon so it's callable before login.
create or replace function public.get_invitation_by_token(p_token text)
returns table (
  id uuid,
  token text,
  cohort_id uuid,
  created_by uuid,
  is_active boolean,
  created_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select i.id, i.token, i.cohort_id, i.created_by, i.is_active, i.created_at
  from public.invitations i
  where i.token = p_token and i.is_active = true;
$$;

revoke all on function public.get_invitation_by_token(text) from public;
grant execute on function public.get_invitation_by_token(text) to anon, authenticated;
