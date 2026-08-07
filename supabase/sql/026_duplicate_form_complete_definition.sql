-- =============================================================================
-- 026_duplicate_form_complete_definition.sql — Copia fiel de formularios
-- =============================================================================
-- La duplicación es el mecanismo de versionado de formularios con respuestas.
-- Debe conservar instrucciones y saltos, además de preguntas y habilidades.

create or replace function public.duplicate_form(p_form_id uuid, p_created_by uuid)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  new_form_id uuid;
begin
  insert into public.forms (
    title, description, instructions_popup, status, accepting_responses,
    allows_partial_save, deadline_at, created_by, purpose
  )
  select title, description, instructions_popup, 'draft', false,
    allows_partial_save, deadline_at, p_created_by, purpose
  from public.forms
  where id = p_form_id
  returning id into new_form_id;

  create temporary table _question_id_map (old_id uuid, new_id uuid) on commit drop;
  insert into _question_id_map (old_id, new_id)
  select q.id, gen_random_uuid() from public.questions q where q.form_id = p_form_id;

  insert into public.questions
    (id, form_id, "order", label, type, config, required, time_limit_seconds)
  select m.new_id, new_form_id, q."order", q.label, q.type, q.config,
    q.required, q.time_limit_seconds
  from public.questions q join _question_id_map m on m.old_id = q.id;

  insert into public.question_option_branches
    (question_id, option_value, target_question_id, ends_form)
  select source_map.new_id, b.option_value, target_map.new_id, b.ends_form
  from public.question_option_branches b
  join _question_id_map source_map on source_map.old_id = b.question_id
  left join _question_id_map target_map on target_map.old_id = b.target_question_id;

  create temporary table _skill_id_map (old_id uuid, new_id uuid) on commit drop;
  insert into _skill_id_map (old_id, new_id)
  select s.id, gen_random_uuid() from public.form_skills s where s.form_id = p_form_id;

  insert into public.form_skills (id, form_id, name, description, icon, color)
  select m.new_id, new_form_id, s.name, s.description, s.icon, s.color
  from public.form_skills s join _skill_id_map m on m.old_id = s.id;

  insert into public.question_skill_weights (question_id, skill_id, weight)
  select qm.new_id, sm.new_id, w.weight
  from public.question_skill_weights w
  join _question_id_map qm on qm.old_id = w.question_id
  join _skill_id_map sm on sm.old_id = w.skill_id;

  return new_form_id;
end;
$$;
