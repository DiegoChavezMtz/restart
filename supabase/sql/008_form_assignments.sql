-- Idempotent: safe to re-run.

create table if not exists public.form_assignments (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references public.forms (id) on delete cascade,
  target_type text not null check (target_type in ('user', 'cohort')),
  target_id uuid not null,
  created_at timestamptz not null default now(),
  unique (form_id, target_type, target_id)
);

create index if not exists idx_form_assignments_form_id on public.form_assignments (form_id);

alter table public.form_assignments enable row level security;

grant select, insert, update, delete on public.form_assignments to authenticated;

drop policy if exists "form_assignments_admin_all" on public.form_assignments;
create policy "form_assignments_admin_all" on public.form_assignments
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "form_assignments_participant_select" on public.form_assignments;
create policy "form_assignments_participant_select" on public.form_assignments
  for select using (
    (target_type = 'user' and target_id = auth.uid())
    or (target_type = 'cohort' and target_id in (
      select cohort_id from public.users where id = auth.uid()
    ))
  );

-- Replace-the-full-set semantics for FormAssignment: one call deletes every
-- existing target for the form and inserts the desired set. plpgsql (not a
-- single `language sql` statement, unlike reorder_questions) because this
-- needs two statements (delete then insert) to run atomically as one unit.
create or replace function public.set_form_assignments(p_form_id uuid, p_targets jsonb)
returns void
language plpgsql
as $$
begin
  delete from public.form_assignments where form_id = p_form_id;

  insert into public.form_assignments (form_id, target_type, target_id)
  select p_form_id, t ->> 'targetType', (t ->> 'targetId')::uuid
  from jsonb_array_elements(p_targets) as t
  on conflict (form_id, target_type, target_id) do nothing;
end;
$$;

grant execute on function public.set_form_assignments(uuid, jsonb) to authenticated;

-- DuplicateForm (docs/CONSTITUCION.md rule 3): the only escape hatch to edit
-- a form once it has responses. Copies Form (forced back to 'draft'),
-- Question, FormSkill, and QuestionSkillWeight with remapped ids; does NOT
-- copy form_assignments or responses. plpgsql + temp tables because a single
-- INSERT...SELECT can't generate and reuse fresh UUIDs consistently across
-- three dependent tables — a sequence of JS-side Supabase calls would risk a
-- half-duplicated form on partial failure, so this runs as one atomic unit.
create or replace function public.duplicate_form(p_form_id uuid, p_created_by uuid)
returns uuid
language plpgsql
as $$
declare
  new_form_id uuid;
begin
  insert into public.forms (
    title, description, status, accepting_responses, allows_partial_save, deadline_at, created_by
  )
  select title, description, 'draft', accepting_responses, allows_partial_save, deadline_at, p_created_by
  from public.forms
  where id = p_form_id
  returning id into new_form_id;

  create temporary table _question_id_map (old_id uuid, new_id uuid) on commit drop;
  insert into _question_id_map (old_id, new_id)
  select q.id, gen_random_uuid()
  from public.questions q
  where q.form_id = p_form_id;

  insert into public.questions (id, form_id, "order", label, type, config, required, time_limit_seconds)
  select m.new_id, new_form_id, q."order", q.label, q.type, q.config, q.required, q.time_limit_seconds
  from public.questions q
  join _question_id_map m on m.old_id = q.id;

  create temporary table _skill_id_map (old_id uuid, new_id uuid) on commit drop;
  insert into _skill_id_map (old_id, new_id)
  select s.id, gen_random_uuid()
  from public.form_skills s
  where s.form_id = p_form_id;

  insert into public.form_skills (id, form_id, name, description, icon, color)
  select m.new_id, new_form_id, s.name, s.description, s.icon, s.color
  from public.form_skills s
  join _skill_id_map m on m.old_id = s.id;

  insert into public.question_skill_weights (question_id, skill_id, weight)
  select qm.new_id, sm.new_id, w.weight
  from public.question_skill_weights w
  join _question_id_map qm on qm.old_id = w.question_id
  join _skill_id_map sm on sm.old_id = w.skill_id;

  return new_form_id;
end;
$$;

grant execute on function public.duplicate_form(uuid, uuid) to authenticated;

-- Deferred participant-facing SELECT policies (see 006_forms_and_questions.sql
-- and 007_form_skills.sql comments: "A later migration (Fase de asignación)
-- adds it" — that migration is this one, now that form_assignments exists).
create or replace function public.is_form_visible_to_participant(p_form_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.forms f
    join public.form_assignments fa on fa.form_id = f.id
    where f.id = p_form_id
      and f.status = 'published'
      and (
        (fa.target_type = 'user' and fa.target_id = auth.uid())
        or (fa.target_type = 'cohort' and fa.target_id in (
          select cohort_id from public.users where id = auth.uid()
        ))
      )
  );
$$;

drop policy if exists "forms_participant_select_assigned" on public.forms;
create policy "forms_participant_select_assigned" on public.forms
  for select using (public.is_form_visible_to_participant(id));

drop policy if exists "questions_participant_select_assigned" on public.questions;
create policy "questions_participant_select_assigned" on public.questions
  for select using (public.is_form_visible_to_participant(form_id));

drop policy if exists "form_skills_participant_select_assigned" on public.form_skills;
create policy "form_skills_participant_select_assigned" on public.form_skills
  for select using (public.is_form_visible_to_participant(form_id));

drop policy if exists "question_skill_weights_participant_select_assigned" on public.question_skill_weights;
create policy "question_skill_weights_participant_select_assigned" on public.question_skill_weights
  for select using (
    exists (
      select 1 from public.questions q
      where q.id = question_skill_weights.question_id
        and public.is_form_visible_to_participant(q.form_id)
    )
  );
