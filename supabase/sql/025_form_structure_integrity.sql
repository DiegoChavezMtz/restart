-- =============================================================================
-- 025_form_structure_integrity.sql — Edición estructural serializable
-- =============================================================================
-- Se bloquea la fila padre del formulario tanto al iniciar una respuesta como
-- al mutar su estructura. Así, una de ambas transacciones espera a la otra y
-- la edición se rechaza si la respuesta alcanzó a crearse primero.

create or replace function public.lock_form_before_response_start()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  perform 1 from public.forms where id = new.form_id for update;
  return new;
end;
$$;

drop trigger if exists lock_form_before_response_start on public.form_responses;
create trigger lock_form_before_response_start
  before insert on public.form_responses
  for each row execute function public.lock_form_before_response_start();

create or replace function public.assert_form_structure_editable()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_old_form_id uuid;
  v_new_form_id uuid;
begin
  if tg_table_name = 'questions' then
    if tg_op <> 'DELETE' then v_new_form_id := new.form_id; end if;
    if tg_op <> 'INSERT' then v_old_form_id := old.form_id; end if;
  elsif tg_table_name = 'form_skills' then
    if tg_op <> 'DELETE' then v_new_form_id := new.form_id; end if;
    if tg_op <> 'INSERT' then v_old_form_id := old.form_id; end if;
  elsif tg_table_name = 'question_skill_weights' then
    if tg_op <> 'DELETE' then
      select q.form_id into v_new_form_id from public.questions q where q.id = new.question_id;
    end if;
    if tg_op <> 'INSERT' then
      select q.form_id into v_old_form_id from public.questions q where q.id = old.question_id;
    end if;
  elsif tg_table_name = 'question_option_branches' then
    if tg_op <> 'DELETE' then
      select q.form_id into v_new_form_id from public.questions q where q.id = new.question_id;
    end if;
    if tg_op <> 'INSERT' then
      select q.form_id into v_old_form_id from public.questions q where q.id = old.question_id;
    end if;
  end if;

  if coalesce(v_new_form_id, v_old_form_id) is null then
    raise exception 'no se pudo resolver el formulario de la edición estructural';
  end if;

  -- El orden estable evita bloqueos cruzados si una mutación mueve una fila
  -- entre formularios. En INSERT/DELETE uno de los dos valores es null.
  perform 1 from public.forms
  where id in (v_old_form_id, v_new_form_id)
  order by id for update;

  if exists (
    select 1 from public.form_responses
    where form_id in (v_old_form_id, v_new_form_id)
  ) then
    raise exception 'el formulario ya tiene respuestas y su estructura no puede modificarse';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists assert_questions_structure_editable on public.questions;
create trigger assert_questions_structure_editable
  before insert or update or delete on public.questions
  for each row execute function public.assert_form_structure_editable();

drop trigger if exists assert_form_skills_structure_editable on public.form_skills;
create trigger assert_form_skills_structure_editable
  before insert or update or delete on public.form_skills
  for each row execute function public.assert_form_structure_editable();

drop trigger if exists assert_question_skill_weights_structure_editable on public.question_skill_weights;
create trigger assert_question_skill_weights_structure_editable
  before insert or update or delete on public.question_skill_weights
  for each row execute function public.assert_form_structure_editable();

drop trigger if exists assert_question_option_branches_structure_editable on public.question_option_branches;
create trigger assert_question_option_branches_structure_editable
  before insert or update or delete on public.question_option_branches
  for each row execute function public.assert_form_structure_editable();

-- La aplicación ya asigna el orden de forma secuencial; este índice convierte
-- esa expectativa en una garantía de base de datos ante solicitudes concurrentes.
create unique index if not exists uq_questions_form_order
  on public.questions (form_id, "order");

-- Inserción serializada: el bloqueo de la fila del formulario evita que dos
-- administradores calculen el mismo siguiente orden.
create or replace function public.append_question(
  p_form_id uuid,
  p_label text,
  p_type text,
  p_config jsonb,
  p_required boolean,
  p_time_limit_seconds integer
)
returns public.questions
language plpgsql
set search_path = public
as $$
declare
  v_question public.questions;
begin
  perform 1 from public.forms where id = p_form_id for update;

  insert into public.questions (
    form_id, "order", label, type, config, required, time_limit_seconds
  )
  values (
    p_form_id,
    coalesce((select max(q."order") + 1 from public.questions q where q.form_id = p_form_id), 0),
    p_label, p_type, p_config, p_required, p_time_limit_seconds
  )
  returning * into v_question;

  return v_question;
end;
$$;

grant execute on function public.append_question(uuid, text, text, jsonb, boolean, integer) to authenticated;
