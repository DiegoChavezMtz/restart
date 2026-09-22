-- 053_evaluations.sql — evaluaciones por cohorte y resultados individuales.
-- Ejecutar después de 028_roles_and_capabilities.sql.

create table if not exists public.evaluations (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid not null references public.cohorts(id) on delete restrict,
  title text not null check (char_length(btrim(title)) between 1 and 160),
  description text,
  period_start date not null,
  period_end date not null,
  status text not null default 'active' check (status in ('active', 'archived')),
  created_by uuid not null references public.users(id),
  created_at timestamptz not null default now(),
  archived_at timestamptz,
  archived_by uuid references public.users(id),
  check (period_end >= period_start),
  check ((status = 'archived') = (archived_at is not null))
);

create index if not exists idx_evaluations_cohort_period
  on public.evaluations(cohort_id, period_start desc);

create table if not exists public.evaluation_assignments (
  id uuid primary key default gen_random_uuid(),
  evaluation_id uuid not null references public.evaluations(id) on delete restrict,
  participant_id uuid not null references public.users(id) on delete restrict,
  assigned_at timestamptz not null default now(),
  unique (evaluation_id, participant_id)
);

create index if not exists idx_evaluation_assignments_participant
  on public.evaluation_assignments(participant_id, evaluation_id);

create table if not exists public.evaluation_results (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.evaluation_assignments(id) on delete restrict,
  version integer not null check (version > 0),
  status text not null default 'draft' check (status in ('draft', 'published')),
  score smallint check (score between 0 and 100),
  object_key text,
  file_name text,
  created_by uuid not null references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_by uuid references public.users(id),
  published_at timestamptz,
  unique (assignment_id, version),
  check ((status = 'published') = (published_at is not null)),
  check ((object_key is null) = (file_name is null))
);

create unique index if not exists idx_evaluation_results_one_draft
  on public.evaluation_results(assignment_id) where status = 'draft';
create index if not exists idx_evaluation_results_visible
  on public.evaluation_results(assignment_id, published_at desc) where status = 'published';

alter table public.evaluations enable row level security;
alter table public.evaluation_assignments enable row level security;
alter table public.evaluation_results enable row level security;

grant select, insert, update, delete on public.evaluations, public.evaluation_assignments, public.evaluation_results to authenticated;

drop policy if exists evaluations_admin_all on public.evaluations;
create policy evaluations_admin_all on public.evaluations for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
drop policy if exists evaluations_participant_select on public.evaluations;
create policy evaluations_participant_select on public.evaluations for select to authenticated
  using (exists (
    select 1 from public.evaluation_assignments a
    where a.evaluation_id = evaluations.id and a.participant_id = auth.uid()
  ));

drop policy if exists evaluation_assignments_admin_all on public.evaluation_assignments;
create policy evaluation_assignments_admin_all on public.evaluation_assignments for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
drop policy if exists evaluation_assignments_participant_select on public.evaluation_assignments;
create policy evaluation_assignments_participant_select on public.evaluation_assignments for select to authenticated
  using (participant_id = auth.uid());

drop policy if exists evaluation_results_admin_all on public.evaluation_results;
create policy evaluation_results_admin_all on public.evaluation_results for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
drop policy if exists evaluation_results_participant_select on public.evaluation_results;
create policy evaluation_results_participant_select on public.evaluation_results for select to authenticated
  using (status = 'published' and exists (
    select 1 from public.evaluation_assignments a where a.id = assignment_id and a.participant_id = auth.uid()
  ));

-- Crea la evaluación y toma una foto de las personas activas de la cohorte.
create or replace function public.create_evaluation(
  p_cohort_id uuid, p_title text, p_description text, p_period_start date, p_period_end date
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_evaluation_id uuid;
begin
  if not public.is_admin() then raise exception 'solo administración puede crear evaluaciones'; end if;
  if p_period_end < p_period_start then raise exception 'la fecha final debe ser posterior a la inicial'; end if;
  insert into public.evaluations(cohort_id, title, description, period_start, period_end, created_by)
  values(p_cohort_id, btrim(p_title), nullif(btrim(p_description), ''), p_period_start, p_period_end, auth.uid())
  returning id into v_evaluation_id;
  insert into public.evaluation_assignments(evaluation_id, participant_id)
  select v_evaluation_id, u.id from public.users u
  where u.cohort_id = p_cohort_id and u.is_active and u.role in ('usuario', 'test');
  return v_evaluation_id;
end;
$$;

create or replace function public.add_evaluation_participant(p_evaluation_id uuid, p_participant_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'solo administración puede asignar evaluaciones'; end if;
  if not exists (select 1 from public.evaluations e join public.users u on u.cohort_id = e.cohort_id where e.id = p_evaluation_id and u.id = p_participant_id and u.is_active and u.role in ('usuario', 'test')) then
    raise exception 'la persona no pertenece a la cohorte activa de esta evaluación';
  end if;
  insert into public.evaluation_assignments(evaluation_id, participant_id) values(p_evaluation_id, p_participant_id) on conflict do nothing;
end;
$$;

-- Un resultado publicado es inmutable: al corregir, se crea/actualiza un borrador de la siguiente versión.
create or replace function public.save_evaluation_result(
  p_assignment_id uuid, p_score smallint, p_object_key text, p_file_name text, p_publish boolean
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_status text; v_version integer; v_current_score smallint; v_current_object_key text; v_current_file_name text;
begin
  if not public.is_admin() then raise exception 'solo administración puede calificar'; end if;
  if p_score is not null and (p_score < 0 or p_score > 100) then raise exception 'la calificación debe ser de 0 a 100'; end if;
  select id, status, score, object_key, file_name into v_id, v_status, v_current_score, v_current_object_key, v_current_file_name
  from public.evaluation_results where assignment_id = p_assignment_id and status = 'draft' for update;
  if p_publish and (coalesce(p_score, v_current_score) is null or coalesce(p_object_key, v_current_object_key) is null or coalesce(p_file_name, v_current_file_name) is null) then
    raise exception 'una evaluación publicada requiere calificación y PDF';
  end if;
  if v_id is null then
    select coalesce(max(version), 0) + 1 into v_version from public.evaluation_results where assignment_id = p_assignment_id;
    insert into public.evaluation_results(assignment_id, version, score, object_key, file_name, status, created_by, published_by, published_at)
    values(p_assignment_id, v_version, p_score, p_object_key, p_file_name, case when p_publish then 'published' else 'draft' end, auth.uid(), case when p_publish then auth.uid() end, case when p_publish then now() end)
    returning id into v_id;
  else
    update public.evaluation_results set score = coalesce(p_score, score), object_key = coalesce(p_object_key, object_key), file_name = coalesce(p_file_name, file_name), updated_at = now(),
      status = case when p_publish then 'published' else 'draft' end,
      published_by = case when p_publish then auth.uid() else published_by end,
      published_at = case when p_publish then now() else published_at end
    where id = v_id;
  end if;
  return v_id;
end;
$$;

create or replace function public.archive_evaluation(p_evaluation_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'solo administración puede archivar evaluaciones'; end if;
  update public.evaluations set status = 'archived', archived_at = now(), archived_by = auth.uid() where id = p_evaluation_id;
end;
$$;

revoke execute on function public.create_evaluation(uuid, text, text, date, date) from anon;
revoke execute on function public.add_evaluation_participant(uuid, uuid) from anon;
revoke execute on function public.save_evaluation_result(uuid, smallint, text, text, boolean) from anon;
revoke execute on function public.archive_evaluation(uuid) from anon;
grant execute on function public.create_evaluation(uuid, text, text, date, date) to authenticated;
grant execute on function public.add_evaluation_participant(uuid, uuid) to authenticated;
grant execute on function public.save_evaluation_result(uuid, smallint, text, text, boolean) to authenticated;
grant execute on function public.archive_evaluation(uuid) to authenticated;
