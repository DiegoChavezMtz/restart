-- =============================================================================
-- 047_fix_job_application_status_trigger.sql — Corrige el trigger de 043
-- =============================================================================
-- Ejecutar después de 046_user_profiles.sql.
--
-- Bug: record_job_application_status_event() en 043_employment_applications.sql
-- corre como trigger BEFORE INSERT e intenta insertar en
-- job_application_status_events usando new.id. En un trigger BEFORE INSERT la
-- fila de job_applications todavía NO existe en la tabla (BEFORE se ejecuta
-- antes de que se persista) — así que el FK de
-- job_application_status_events.job_application_id fallaba SIEMPRE, en cada
-- postulación nueva, sin excepción. No es un caso borde: como job_applications
-- nunca llegó a insertarse con éxito, no hace falta backfill de datos.
--
-- Fix: separar en dos triggers.
--   1. BEFORE — solo fija status_updated_at (no toca otra tabla).
--   2. AFTER  — inserta el evento en job_application_status_events, cuando la
--      fila padre ya existe y el FK sí se puede satisfacer.
-- =============================================================================

drop trigger if exists record_job_application_status_event on public.job_applications;

create or replace function public.set_job_application_status_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and new.status is distinct from old.status then
    new.status_updated_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists set_job_application_status_updated_at on public.job_applications;
create trigger set_job_application_status_updated_at
  before insert or update of status on public.job_applications
  for each row execute function public.set_job_application_status_updated_at();

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
    insert into public.job_application_status_events (job_application_id, status, occurred_at)
    values (new.id, new.status, now());
  end if;
  return new;
end;
$$;

create trigger record_job_application_status_event
  after insert or update of status on public.job_applications
  for each row execute function public.record_job_application_status_event();

-- =============================================================================
-- Verificar tras correr:
--   select tgname, tgtype from pg_trigger where tgrelid = 'public.job_applications'::regclass;
--   -- Debe haber dos triggers: uno BEFORE (set_job_application_status_updated_at)
--   -- y uno AFTER (record_job_application_status_event).
--   -- Luego, registrar una postulación de prueba desde la UI y confirmar que
--   -- aparece una fila en job_application_status_events con status = 'applied'.
-- =============================================================================
