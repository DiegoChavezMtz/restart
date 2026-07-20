-- Idempotent: safe to re-run.

create table if not exists public.form_responses (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references public.forms (id) on delete cascade,
  participant_id uuid not null references public.users (id) on delete cascade,
  status text not null default 'in_progress' check (status in ('in_progress', 'completed')),
  current_question_order integer not null default 0,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (form_id, participant_id)
);

create index if not exists idx_form_responses_form_id on public.form_responses (form_id);
create index if not exists idx_form_responses_participant_id on public.form_responses (participant_id);

create table if not exists public.answers (
  id uuid primary key default gen_random_uuid(),
  response_id uuid not null references public.form_responses (id) on delete cascade,
  question_id uuid not null references public.questions (id) on delete cascade,
  value jsonb not null,
  auto_submitted_by_timeout boolean not null default false,
  created_at timestamptz not null default now(),
  unique (response_id, question_id)
);

create index if not exists idx_answers_response_id on public.answers (response_id);

alter table public.form_responses enable row level security;
alter table public.answers enable row level security;

grant select, insert, update, delete on public.form_responses to authenticated;
grant select, insert, update, delete on public.answers to authenticated;

drop policy if exists "form_responses_admin_all" on public.form_responses;
create policy "form_responses_admin_all" on public.form_responses
  for all using (public.is_admin()) with check (public.is_admin());

-- Participant owns the full lifecycle of their own response row: select
-- (check status/pointer), insert (start), update (advance the pointer /
-- mark completed), delete (discard-and-restart when allowsPartialSave=false).
drop policy if exists "form_responses_participant_own" on public.form_responses;
create policy "form_responses_participant_own" on public.form_responses
  for all using (participant_id = auth.uid()) with check (participant_id = auth.uid());

drop policy if exists "answers_admin_all" on public.answers;
create policy "answers_admin_all" on public.answers
  for all using (public.is_admin()) with check (public.is_admin());

-- Answers are immutable once submitted (rule 4: no going back) — the
-- participant gets select + insert only, never update/delete.
drop policy if exists "answers_participant_select" on public.answers;
create policy "answers_participant_select" on public.answers
  for select using (
    exists (
      select 1 from public.form_responses fr
      where fr.id = answers.response_id and fr.participant_id = auth.uid()
    )
  );

drop policy if exists "answers_participant_insert" on public.answers;
create policy "answers_participant_insert" on public.answers
  for insert with check (
    exists (
      select 1 from public.form_responses fr
      where fr.id = answers.response_id and fr.participant_id = auth.uid()
    )
  );
