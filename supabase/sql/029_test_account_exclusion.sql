-- =============================================================================
-- 029_test_account_exclusion.sql — Respuestas y operación de cuentas test
-- =============================================================================

alter table public.form_responses
  add column if not exists is_test_response boolean not null default false;
create index if not exists idx_form_responses_official_by_form
  on public.form_responses (form_id) where is_test_response = false;

-- Una respuesta conserva su condición de prueba aunque el rol de la cuenta se
-- modifique posteriormente.
create or replace function public.assert_participant_form_access(p_form_id uuid)
returns public.forms
language plpgsql security definer set search_path = public as $$
declare v_form public.forms;
begin
  if not public.is_response_actor() then
    raise exception 'solo usuario o test pueden responder formularios';
  end if;
  select f.* into v_form from public.forms f
  where f.id = p_form_id and f.purpose = 'participant'
    and public.is_form_visible_to_participant(f.id);
  if not found then raise exception 'formulario no disponible para el participante'; end if;
  return v_form;
end;
$$;

create or replace function public.resume_participant_form_response(p_form_id uuid)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_form public.forms;
  v_response public.form_responses;
  v_first_question_id uuid;
  v_response_exists boolean := false;
begin
  v_form := public.assert_participant_form_access(p_form_id);
  select * into v_response from public.form_responses
  where form_id = p_form_id and participant_id = auth.uid() for update;
  v_response_exists := found;
  if v_response_exists and v_response.status = 'completed' then return v_response.id; end if;
  if not v_form.accepting_responses then raise exception 'el formulario no está aceptando respuestas'; end if;
  if v_response_exists and v_form.allows_partial_save then return v_response.id; end if;
  select q.id into v_first_question_id from public.questions q
  where q.form_id = p_form_id order by q."order" limit 1;
  if v_first_question_id is null then raise exception 'el formulario no tiene preguntas disponibles'; end if;
  if v_response_exists then delete from public.form_responses where id = v_response.id; end if;
  insert into public.form_responses (form_id, participant_id, current_question_id, is_test_response)
  values (p_form_id, auth.uid(), v_first_question_id, public.is_test_actor())
  returning id into v_response.id;
  return v_response.id;
end;
$$;

-- No se registra asistencia de pruebas; sus pruebas de interfaz no contaminan
-- sesiones, resúmenes ni exportaciones.
create or replace function public.reject_test_attendance_record()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from public.users u where u.id = new.participant_id and u.role = 'test') then
    raise exception 'las cuentas test no generan registros de asistencia';
  end if;
  return new;
end;
$$;
drop trigger if exists reject_test_attendance_record on public.attendance_records;
create trigger reject_test_attendance_record
  before insert or update of participant_id on public.attendance_records
  for each row execute function public.reject_test_attendance_record();

-- Los jobs de cumplimiento operan únicamente sobre usuarios reales.
create or replace function public.is_operational_user(p_user_id uuid)
returns boolean language sql security definer set search_path = public stable as $$
  select exists (select 1 from public.users u where u.id = p_user_id and u.role = 'usuario' and u.is_active = true);
$$;
