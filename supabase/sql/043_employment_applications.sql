-- =============================================================================
-- 043_employment_applications.sql  —  Módulo de empleabilidad: postulaciones
-- =============================================================================
-- Idempotente. Correr manualmente en el SQL Editor DESPUÉS de
-- 042_employment_cv_versions.sql. Ver docs/MODULO_EMPLEO.md para el diseño
-- completo.
--
-- Nota de refinamiento sobre el diseño en docs/MODULO_EMPLEO.md: ahí se
-- proponía una RPC update_application_status() al estilo de
-- justify_attendance() (014_attendance.sql). Aquí se usa en su lugar un
-- trigger AFTER INSERT/UPDATE OF status, que es el patrón que el propio
-- proyecto ya usa para este mismo problema en record_appointment_status_change()
-- (017_appointments.sql). Es más simple: el usuario actualiza
-- job_applications.status directamente (permitido por su propia policy RLS)
-- y el trigger registra el evento — sin necesitar una función RPC dedicada.
-- =============================================================================


-- 1. Postulaciones ----------------------------------------------------------------
create table if not exists public.job_applications (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references public.users (id) on delete cascade,
  job_target_id       uuid not null references public.job_targets (id) on delete restrict,
  cv_version_id       uuid not null references public.cv_versions (id) on delete restrict,
  source              text not null check (source in ('linkedin', 'indeed', 'occ', 'otro')),
  application_type    text not null check (application_type in ('proactive', 'reactive')),
  company_name        text not null,
  role_title          text not null,
  status              text not null default 'applied'
                        check (status in ('applied', 'response', 'interview', 'offer', 'rejected')),
  applied_at          date not null default current_date,
  status_updated_at   timestamptz not null default now()
);
create index if not exists idx_job_applications_user_id on public.job_applications (user_id);


-- 2. Histórico de estatus — alimentado por trigger, no por escritura directa --------
create table if not exists public.job_application_status_events (
  id                  uuid primary key default gen_random_uuid(),
  job_application_id  uuid not null references public.job_applications (id) on delete cascade,
  status              text not null check (status in ('applied', 'response', 'interview', 'offer', 'rejected')),
  occurred_at         timestamptz not null default now()
);
create index if not exists idx_job_application_status_events_application_id
  on public.job_application_status_events (job_application_id);


-- 3. Investigación de reclutador — 1:1, solo aplica si source = 'linkedin' ---------
create table if not exists public.recruiter_research (
  job_application_id    uuid primary key references public.job_applications (id) on delete cascade,
  recruiter_name        text,
  recruiter_role        text,
  company_tenure_note   text,
  recent_company_fact   text,
  common_ground_note    text,
  outreach_message      text,
  completed_at          timestamptz
);


-- 4. Trigger — registra automáticamente cada cambio de estatus ---------------------
create or replace function public.record_job_application_status_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.job_application_status_events (job_application_id, status, occurred_at)
    values (new.id, new.status, now());
  elsif new.status is distinct from old.status then
    new.status_updated_at := now();
    insert into public.job_application_status_events (job_application_id, status, occurred_at)
    values (new.id, new.status, now());
  end if;
  return new;
end;
$$;

drop trigger if exists record_job_application_status_event on public.job_applications;
create trigger record_job_application_status_event
  before insert or update of status on public.job_applications
  for each row execute function public.record_job_application_status_event();
-- BEFORE (no AFTER) porque también necesita poder fijar new.status_updated_at
-- en la misma fila antes de que se persista.


-- 5. RLS ----------------------------------------------------------------------
alter table public.job_applications             enable row level security;
alter table public.job_application_status_events enable row level security;
alter table public.recruiter_research            enable row level security;

grant select, insert, update, delete on public.job_applications to authenticated;
grant select                        on public.job_application_status_events to authenticated;
grant select, insert, update, delete on public.recruiter_research to authenticated;

-- 5.1 job_applications: dueño total
drop policy if exists job_applications_owner_all on public.job_applications;
create policy job_applications_owner_all
  on public.job_applications for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- 5.2 job_application_status_events: dueño solo lectura (se escribe vía trigger)
drop policy if exists job_application_status_events_owner_select on public.job_application_status_events;
create policy job_application_status_events_owner_select
  on public.job_application_status_events for select to authenticated
  using (exists (
    select 1 from public.job_applications a
    where a.id = job_application_id and a.user_id = auth.uid()
  ));

-- 5.3 recruiter_research: dueño total vía job_applications.user_id
drop policy if exists recruiter_research_owner_all on public.recruiter_research;
create policy recruiter_research_owner_all
  on public.recruiter_research for all to authenticated
  using (exists (
    select 1 from public.job_applications a
    where a.id = job_application_id and a.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.job_applications a
    where a.id = job_application_id and a.user_id = auth.uid()
  ));


-- =============================================================================
-- Verificar tras correr:
--   select tablename, policyname from pg_policies
--   where tablename in ('job_applications','job_application_status_events','recruiter_research');
--   select tgname from pg_trigger where tgrelid = 'public.job_applications'::regclass;
-- =============================================================================
