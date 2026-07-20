-- Idempotent: safe to re-run.

-- Avoids infinite recursion when a policy on public.users needs to check
-- the caller's own role. SECURITY DEFINER + fixed search_path per project
-- convention (see docs/CONSTITUCION.md section 7, handle_new_user note).
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.users u where u.id = auth.uid() and u.role = 'admin'
  );
$$;

grant select, insert, update, delete on public.cohorts to authenticated;
grant select, insert, update, delete on public.users to authenticated;

-- cohorts
drop policy if exists "cohorts_admin_all" on public.cohorts;
create policy "cohorts_admin_all" on public.cohorts
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "cohorts_participant_select_own" on public.cohorts;
create policy "cohorts_participant_select_own" on public.cohorts
  for select using (id in (select cohort_id from public.users where id = auth.uid()));

-- users: "cada usuario lee/actualiza su propia fila; admin lee todas"
drop policy if exists "users_admin_all" on public.users;
create policy "users_admin_all" on public.users
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "users_select_own" on public.users;
create policy "users_select_own" on public.users
  for select using (id = auth.uid());

drop policy if exists "users_update_own" on public.users;
create policy "users_update_own" on public.users
  for update using (id = auth.uid()) with check (id = auth.uid());
