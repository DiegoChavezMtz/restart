-- =============================================================================
-- 014_attendance.sql  —  Módulo de asistencia ("Pase de lista")
-- =============================================================================
-- Idempotente. Correr manualmente en el SQL Editor DESPUÉS de 013_auth_hardening.sql.
-- Sigue el patrón del resto de supabase/sql/: snake_case, PK uuid, RLS obligatorio,
-- policies vía public.is_admin() (definida en 003_rls_baseline.sql).
--
-- Decisiones ya tomadas en este archivo (las abiertas se marcan con TODO):
--   * status incluye 'justificado' como en el modelo actual del cliente (Opción A).
--   * file_path / file_type / description-solo => justificación puede guardarse sin archivo.
--   * bucket privado con mime types y límite de tamaño fijados a nivel bucket.
-- =============================================================================


-- 1. Sesiones — un "día" de asistencia por generación --------------------------
create table if not exists public.attendance_sessions (
  id           uuid primary key default gen_random_uuid(),
  cohort_id    uuid not null references public.cohorts (id) on delete cascade,
  session_date date not null,
  created_by   uuid not null references public.users (id),   -- NO ACTION: preserva auditoría
  created_at   timestamptz not null default now(),
  unique (cohort_id, session_date)
);
-- El UNIQUE (cohort_id, session_date) ya indexa cohort_id como columna líder,
-- así que "listar sesiones de una generación" no requiere índice adicional.


-- 2. Records — estado de un participante en una sesión -------------------------
create table if not exists public.attendance_records (
  id             uuid primary key default gen_random_uuid(),
  session_id     uuid not null references public.attendance_sessions (id) on delete cascade,
  participant_id uuid not null references public.users (id) on delete cascade,
  status         text not null check (status in ('asistio', 'retardo', 'falta', 'justificado')),
  recorded_by    uuid not null references public.users (id),  -- NO ACTION: preserva auditoría
  recorded_at    timestamptz not null default now(),
  unique (session_id, participant_id)
);
-- Solo índice por participant_id: el UNIQUE (session_id, participant_id) ya cubre
-- las consultas por session_id (columna líder). Un índice separado por session_id
-- sería redundante. participant_id sí lo necesita (va en 2da posición del compuesto).
create index if not exists idx_attendance_records_participant_id
  on public.attendance_records (participant_id);


-- 3. Justificaciones — 1:1 con un record 'justificado' -------------------------
create table if not exists public.attendance_justifications (
  attendance_record_id uuid primary key
    references public.attendance_records (id) on delete cascade,
  description text not null,
  file_path   text,   -- ruta dentro del bucket, NO url. nullable => archivo opcional
  file_type   text check (
    file_type is null
    or file_type in ('application/pdf', 'image/png', 'image/jpeg')
  ),
  created_at  timestamptz not null default now()
);
-- PK = FK garantiza el 1:1 y cubre los lookups por record.


-- 4. RLS -----------------------------------------------------------------------
alter table public.attendance_sessions       enable row level security;
alter table public.attendance_records        enable row level security;
alter table public.attendance_justifications enable row level security;

-- 4.1 sessions: admin total; participante lee las de su propia cohorte
drop policy if exists attendance_sessions_admin_all on public.attendance_sessions;
create policy attendance_sessions_admin_all
  on public.attendance_sessions for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists attendance_sessions_participant_select on public.attendance_sessions;
create policy attendance_sessions_participant_select
  on public.attendance_sessions for select to authenticated
  using (cohort_id = (select cohort_id from public.users where id = auth.uid()));

-- 4.2 records: admin total; participante lee solo los suyos
drop policy if exists attendance_records_admin_all on public.attendance_records;
create policy attendance_records_admin_all
  on public.attendance_records for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists attendance_records_participant_select on public.attendance_records;
create policy attendance_records_participant_select
  on public.attendance_records for select to authenticated
  using (participant_id = auth.uid());

-- 4.3 justifications: admin total; participante lee las de sus propios records
drop policy if exists attendance_justifications_admin_all on public.attendance_justifications;
create policy attendance_justifications_admin_all
  on public.attendance_justifications for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists attendance_justifications_participant_select on public.attendance_justifications;
create policy attendance_justifications_participant_select
  on public.attendance_justifications for select to authenticated
  using (exists (
    select 1 from public.attendance_records r
    where r.id = attendance_record_id
      and r.participant_id = auth.uid()
  ));


-- 5. Storage — bucket privado para archivos de justificación -------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'attendance-justifications',
  'attendance-justifications',
  false,
  5242880,   -- 5 MB. TODO(§4.4): confirmar límite.
  array['application/pdf', 'image/png', 'image/jpeg']
)
on conflict (id) do nothing;

-- Solo admin sube/lee/borra. La lectura del participante (futuro "mi asistencia")
-- vía signed URL requerirá luego una policy select que empate el path con su record.
drop policy if exists attendance_justifications_storage_admin_all on storage.objects;
create policy attendance_justifications_storage_admin_all
  on storage.objects for all to authenticated
  using (bucket_id = 'attendance-justifications' and public.is_admin())
  with check (bucket_id = 'attendance-justifications' and public.is_admin());


-- 6. RPC — operaciones atómicas del flujo de justificación --------------------
-- PostgREST no puede transaccionar dos writes sueltos (record + justification),
-- así que estas dos operaciones viven como funciones SECURITY DEFINER con check
-- de admin adentro. El repo (SupabaseAttendanceRepository) las llama vía rpc().
--
-- TODO(rol profesor, §4.1): si un 'profesor' debe poder tomar/justificar lista,
-- cambiar is_admin() por un helper is_staff() en ambas funciones. Es el único
-- punto a re-tocar.
-- TODO(archivo obligatorio, §4.3): hoy description es requerido y file_* opcional
-- (igual que el modal actual). Si el archivo se vuelve obligatorio, validarlo aquí.

-- 6.1 Justificar: upsert de record a 'justificado' + upsert de la justificación
create or replace function public.justify_attendance(
  p_session_id     uuid,
  p_participant_id uuid,
  p_description    text,
  p_file_path      text default null,
  p_file_type      text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_record_id uuid;
begin
  if not public.is_admin() then
    raise exception 'solo un admin puede justificar asistencia';
  end if;

  insert into public.attendance_records (session_id, participant_id, status, recorded_by)
  values (p_session_id, p_participant_id, 'justificado', auth.uid())
  on conflict (session_id, participant_id) do update
    set status = 'justificado', recorded_by = auth.uid(), recorded_at = now()
  returning id into v_record_id;

  insert into public.attendance_justifications
    (attendance_record_id, description, file_path, file_type)
  values (v_record_id, p_description, p_file_path, p_file_type)
  on conflict (attendance_record_id) do update
    set description = excluded.description,
        file_path   = excluded.file_path,
        file_type   = excluded.file_type;

  return v_record_id;
end;
$$;

-- 6.2 Quitar justificación: borra la fila y regresa el record a 'falta'
--     (una falta es el único origen posible de un 'justificado')
create or replace function public.remove_attendance_justification(p_record_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'solo un admin puede quitar justificaciones';
  end if;

  delete from public.attendance_justifications
  where attendance_record_id = p_record_id;

  update public.attendance_records
  set status = 'falta', recorded_by = auth.uid(), recorded_at = now()
  where id = p_record_id;
end;
$$;

-- Solo authenticated puede invocarlas (el gate real de admin está adentro).
revoke execute on function public.justify_attendance(uuid, uuid, text, text, text) from anon;
revoke execute on function public.remove_attendance_justification(uuid) from anon;
grant  execute on function public.justify_attendance(uuid, uuid, text, text, text) to authenticated;
grant  execute on function public.remove_attendance_justification(uuid) to authenticated;


-- =============================================================================
-- Verificar tras correr:
--   select tablename, policyname from pg_policies
--   where tablename like 'attendance_%';
--   select id, public, file_size_limit, allowed_mime_types
--   from storage.buckets where id = 'attendance-justifications';
-- =============================================================================