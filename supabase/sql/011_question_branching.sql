-- Idempotent: safe to re-run.

-- Conditional branching between single_choice questions. Two things happen
-- here: (1) form_responses moves its "where is the participant" pointer from
-- an order index (current_question_order, always +1) to a direct FK
-- (current_question_id), since branching means the next question is no
-- longer always "the next order"; (2) a new table stores, per option of a
-- single_choice question, an optional override of where to go next.

create table if not exists public.question_option_branches (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions (id) on delete cascade,
  option_value text not null,
  target_question_id uuid references public.questions (id) on delete cascade,
  ends_form boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (question_id, option_value),
  -- Exactly one of target_question_id / ends_form must be set (XOR).
  check ((target_question_id is not null) != ends_form)
);

create index if not exists idx_question_option_branches_question_id
  on public.question_option_branches (question_id);
create index if not exists idx_question_option_branches_target_question_id
  on public.question_option_branches (target_question_id);

-- Real integrity check, not just application-layer validation: only
-- single_choice questions can have branch rules, and a rule can only target
-- a question with a strictly greater `order` in the same form — forward-only
-- jumps, which is what rules out loops by construction (no separate cycle
-- detection needed).
create or replace function public.validate_question_option_branch()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  source_type text;
  source_order integer;
  source_form_id uuid;
  target_order integer;
  target_form_id uuid;
begin
  select type, "order", form_id into source_type, source_order, source_form_id
  from public.questions where id = new.question_id;

  if source_type is distinct from 'single_choice' then
    raise exception 'QuestionOptionBranch solo aplica a preguntas de tipo single_choice';
  end if;

  if new.target_question_id is not null then
    select "order", form_id into target_order, target_form_id
    from public.questions where id = new.target_question_id;

    if target_form_id is null or target_form_id != source_form_id then
      raise exception 'targetQuestionId debe pertenecer al mismo formulario';
    end if;
    if target_order <= source_order then
      raise exception 'targetQuestionId debe tener un order mayor al de questionId (solo se permite saltar hacia adelante)';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_validate_question_option_branch on public.question_option_branches;
create trigger trg_validate_question_option_branch
  before insert or update on public.question_option_branches
  for each row execute function public.validate_question_option_branch();

alter table public.question_option_branches enable row level security;

grant select, insert, update, delete on public.question_option_branches to authenticated;

drop policy if exists "question_option_branches_admin_all" on public.question_option_branches;
create policy "question_option_branches_admin_all" on public.question_option_branches
  for all using (public.is_admin()) with check (public.is_admin());

-- Same pattern as question_skill_weights_participant_select_assigned
-- (007_form_skills.sql via 008's deferred policies): a participant can read
-- branch rules for questions of forms visible to them, so the participant
-- response flow can resolve its own next question.
drop policy if exists "question_option_branches_participant_select_assigned" on public.question_option_branches;
create policy "question_option_branches_participant_select_assigned" on public.question_option_branches
  for select using (
    exists (
      select 1 from public.questions q
      where q.id = question_option_branches.question_id
        and public.is_form_visible_to_participant(q.form_id)
    )
  );

-- Replace-the-full-set semantics for a question's branch rules, same
-- rationale as set_form_assignments (008_form_assignments.sql): delete then
-- insert must run as one atomic unit. Not security definer — questions_admin_all
-- (transitively, via the trigger reading public.questions) still gates it.
create or replace function public.set_question_option_branches(p_question_id uuid, p_branches jsonb)
returns void
language plpgsql
as $$
begin
  delete from public.question_option_branches where question_id = p_question_id;

  insert into public.question_option_branches (question_id, option_value, target_question_id, ends_form)
  select
    p_question_id,
    b ->> 'optionValue',
    nullif(b ->> 'targetQuestionId', '')::uuid,
    (b ->> 'endsForm')::boolean
  from jsonb_array_elements(p_branches) as b;
end;
$$;

grant execute on function public.set_question_option_branches(uuid, jsonb) to authenticated;

-- form_responses: order-index pointer -> direct question FK.
alter table public.form_responses
  add column if not exists current_question_id uuid references public.questions (id) on delete set null;

update public.form_responses fr
set current_question_id = q.id
from public.questions q
where q.form_id = fr.form_id
  and q."order" = fr.current_question_order
  and fr.current_question_id is null;

alter table public.form_responses drop column if exists current_question_order;
