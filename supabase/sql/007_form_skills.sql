-- Idempotent: safe to re-run.

create table if not exists public.form_skills (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references public.forms (id) on delete cascade,
  name text not null,
  description text,
  icon text,
  color text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_form_skills_form_id on public.form_skills (form_id);

create table if not exists public.question_skill_weights (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null unique references public.questions (id) on delete cascade,
  skill_id uuid not null references public.form_skills (id) on delete cascade,
  weight integer not null check (weight >= 1 and weight <= 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_question_skill_weights_skill_id on public.question_skill_weights (skill_id);

alter table public.form_skills enable row level security;
alter table public.question_skill_weights enable row level security;

grant select, insert, update, delete on public.form_skills to authenticated;
grant select, insert, update, delete on public.question_skill_weights to authenticated;

drop policy if exists "form_skills_admin_all" on public.form_skills;
create policy "form_skills_admin_all" on public.form_skills
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "question_skill_weights_admin_all" on public.question_skill_weights;
create policy "question_skill_weights_admin_all" on public.question_skill_weights
  for all using (public.is_admin()) with check (public.is_admin());

-- Participant-facing SELECT policies are intentionally NOT defined here —
-- same reasoning as forms_admin_all/questions_admin_all in
-- 006_forms_and_questions.sql: they depend on form_assignments (explicitly
-- deferred to a later milestone).
