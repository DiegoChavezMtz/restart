-- =============================================================================
-- 024_secure_participant_form_responses.sql — Flujo transaccional y RLS estricto
-- =============================================================================
-- Las respuestas de participantes no se escriben directamente. Las dos RPC de
-- este archivo concentran las validaciones de visibilidad, estado, secuencia y
-- pertenencia de preguntas en una única transacción.

create or replace function public.validate_form_response_current_question()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.current_question_id is not null and not exists (
    select 1 from public.questions q
    where q.id = new.current_question_id and q.form_id = new.form_id
  ) then
    raise exception 'current_question_id debe pertenecer al formulario de la respuesta';
  end if;
  return new;
end;
$$;

drop trigger if exists validate_form_response_current_question on public.form_responses;
create trigger validate_form_response_current_question
  before insert or update of form_id, current_question_id on public.form_responses
  for each row execute function public.validate_form_response_current_question();

create or replace function public.validate_answer_question_belongs_to_response_form()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.form_responses fr
    join public.questions q on q.form_id = fr.form_id
    where fr.id = new.response_id and q.id = new.question_id
  ) then
    raise exception 'question_id debe pertenecer al formulario de la respuesta';
  end if;
  return new;
end;
$$;

drop trigger if exists validate_answer_question_belongs_to_response_form on public.answers;
create trigger validate_answer_question_belongs_to_response_form
  before insert or update of response_id, question_id on public.answers
  for each row execute function public.validate_answer_question_belongs_to_response_form();

create or replace function public.assert_participant_form_access(p_form_id uuid)
returns public.forms
language plpgsql
security definer
set search_path = public
as $$
declare
  v_form public.forms;
begin
  if not exists (
    select 1 from public.users u where u.id = auth.uid() and u.role = 'participant'
  ) then
    raise exception 'solo los participantes pueden responder formularios';
  end if;

  select f.* into v_form
  from public.forms f
  where f.id = p_form_id
    and f.purpose = 'participant'
    and public.is_form_visible_to_participant(f.id);

  if not found then
    raise exception 'formulario no disponible para el participante';
  end if;

  return v_form;
end;
$$;

-- Crea o recupera la respuesta de un participante. Un formulario que no
-- permite guardado parcial reinicia sólo si todavía acepta respuestas.
create or replace function public.resume_participant_form_response(p_form_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_form public.forms;
  v_response public.form_responses;
  v_first_question_id uuid;
  v_response_exists boolean := false;
begin
  v_form := public.assert_participant_form_access(p_form_id);

  select * into v_response
  from public.form_responses
  where form_id = p_form_id and participant_id = auth.uid()
  for update;
  v_response_exists := found;

  if v_response_exists and v_response.status = 'completed' then
    return v_response.id;
  end if;

  if not v_form.accepting_responses then
    raise exception 'el formulario no está aceptando respuestas';
  end if;

  if v_response_exists and v_form.allows_partial_save then
    return v_response.id;
  end if;

  select q.id into v_first_question_id
  from public.questions q
  where q.form_id = p_form_id
  order by q."order"
  limit 1;

  if v_first_question_id is null then
    raise exception 'el formulario no tiene preguntas disponibles';
  end if;

  if v_response_exists then
    delete from public.form_responses where id = v_response.id;
  end if;

  insert into public.form_responses (form_id, participant_id, current_question_id)
  values (p_form_id, auth.uid(), v_first_question_id)
  returning id into v_response.id;

  return v_response.id;
end;
$$;

-- Registra una respuesta válida y avanza (o completa) el formulario. La
-- pregunta y el puntero se validan dentro de la misma transacción para impedir
-- respuestas fuera de orden o entre formularios.
create or replace function public.submit_participant_form_answer(
  p_response_id uuid,
  p_question_id uuid,
  p_value jsonb,
  p_auto_submitted_by_timeout boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_response public.form_responses;
  v_question public.questions;
  v_next_question_id uuid;
  v_branch_target_id uuid;
  v_branch_ends_form boolean;
  v_max_length integer;
  v_min_selections integer;
begin
  select * into v_response
  from public.form_responses
  where id = p_response_id and participant_id = auth.uid()
  for update;

  if not found then
    raise exception 'respuesta de formulario inexistente';
  end if;
  if v_response.status = 'completed' then
    raise exception 'el formulario ya fue completado';
  end if;
  if v_response.current_question_id is distinct from p_question_id then
    raise exception 'la pregunta no es la pregunta actual de la respuesta';
  end if;

  perform public.assert_participant_form_access(v_response.form_id);

  if not (select f.accepting_responses from public.forms f where f.id = v_response.form_id) then
    raise exception 'el formulario no está aceptando respuestas';
  end if;

  select * into v_question
  from public.questions
  where id = p_question_id and form_id = v_response.form_id;
  if not found then
    raise exception 'pregunta inexistente o ajena al formulario';
  end if;

  if not p_auto_submitted_by_timeout and p_value is null then
    raise exception 'la respuesta es obligatoria para continuar';
  end if;

  if p_value is not null then
    if v_question.type = 'likert' then
      if jsonb_typeof(p_value) <> 'number'
        or (p_value #>> '{}') !~ '^-?[0-9]+$'
        or (p_value #>> '{}')::integer < (v_question.config ->> 'scaleMin')::integer
        or (p_value #>> '{}')::integer > (v_question.config ->> 'scaleMax')::integer then
        raise exception 'valor Likert inválido';
      end if;
    elsif v_question.type = 'open_text' then
      v_max_length := nullif(v_question.config ->> 'maxLength', '')::integer;
      if jsonb_typeof(p_value) <> 'string'
        or (v_max_length is not null and char_length(p_value #>> '{}') > v_max_length) then
        raise exception 'texto de respuesta inválido';
      end if;
    elsif v_question.type = 'single_choice' then
      if jsonb_typeof(p_value) <> 'string'
        or not exists (
          select 1 from jsonb_array_elements_text(v_question.config -> 'options') option_value
          where option_value = p_value #>> '{}'
        ) then
        raise exception 'opción de respuesta inválida';
      end if;
    elsif v_question.type = 'checkbox' then
      v_min_selections := nullif(v_question.config ->> 'minSelections', '')::integer;
      if jsonb_typeof(p_value) <> 'array'
        or jsonb_array_length(p_value) <> (
          select count(distinct answer_value)
          from jsonb_array_elements_text(p_value) answer_value
        )
        or exists (
          select 1 from jsonb_array_elements_text(p_value) answer_value
          where not exists (
            select 1 from jsonb_array_elements_text(v_question.config -> 'options') option_value
            where option_value = answer_value
          )
        )
        or (v_min_selections is not null and jsonb_array_length(p_value) < v_min_selections) then
        raise exception 'selección de respuesta inválida';
      end if;
    else
      raise exception 'tipo de pregunta inválido';
    end if;
  end if;

  insert into public.answers (response_id, question_id, value, auto_submitted_by_timeout)
  values (v_response.id, v_question.id, p_value, p_auto_submitted_by_timeout);

  if v_question.type = 'single_choice' and jsonb_typeof(p_value) = 'string' then
    select b.target_question_id, b.ends_form
    into v_branch_target_id, v_branch_ends_form
    from public.question_option_branches b
    where b.question_id = v_question.id and b.option_value = p_value #>> '{}';
  end if;

  if coalesce(v_branch_ends_form, false) then
    v_next_question_id := null;
  elsif v_branch_target_id is not null then
    v_next_question_id := v_branch_target_id;
  else
    select q.id into v_next_question_id
    from public.questions q
    where q.form_id = v_response.form_id and q."order" > v_question."order"
    order by q."order"
    limit 1;
  end if;

  if v_next_question_id is null then
    update public.form_responses
    set current_question_id = null, status = 'completed', submitted_at = now(), updated_at = now()
    where id = v_response.id;
  else
    update public.form_responses
    set current_question_id = v_next_question_id, updated_at = now()
    where id = v_response.id;
  end if;

  return v_next_question_id;
end;
$$;

-- Lectura propia sí; las escrituras se realizan exclusivamente mediante RPC.
drop policy if exists "form_responses_participant_own" on public.form_responses;
drop policy if exists "form_responses_participant_select_own" on public.form_responses;
create policy "form_responses_participant_select_own" on public.form_responses
  for select to authenticated using (participant_id = auth.uid());

drop policy if exists "answers_participant_select" on public.answers;
drop policy if exists "answers_participant_insert" on public.answers;
drop policy if exists "answers_participant_select_own" on public.answers;
create policy "answers_participant_select_own" on public.answers
  for select to authenticated using (
    exists (
      select 1 from public.form_responses fr
      where fr.id = answers.response_id and fr.participant_id = auth.uid()
    )
  );

revoke all on function public.assert_participant_form_access(uuid) from public;
revoke all on function public.resume_participant_form_response(uuid) from public;
revoke all on function public.submit_participant_form_answer(uuid, uuid, jsonb, boolean) from public;
grant execute on function public.resume_participant_form_response(uuid) to authenticated;
grant execute on function public.submit_participant_form_answer(uuid, uuid, jsonb, boolean) to authenticated;
