-- Idempotent: safe to re-run.

create table if not exists public.forms (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  status text not null default 'draft' check (status in ('draft', 'published', 'closed')),
  accepting_responses boolean not null default false,
  allows_partial_save boolean not null default true,
  deadline_at timestamptz, -- reservado, sin lógica activa aún (docs/CONSTITUCION.md section 4)
  created_by uuid not null references public.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references public.forms (id) on delete cascade,
  "order" integer not null,
  label text not null,
  type text not null check (type in ('likert', 'open_text', 'single_choice', 'checkbox')),
  config jsonb not null,
  required boolean not null default true,
  time_limit_seconds integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
  -- created_at/updated_at are DB bookkeeping only; the Question domain
  -- entity (docs/CONSTITUCION.md section 4) has no timestamps, and
  -- toDomainQuestion() intentionally does not surface these columns.
);

create index if not exists idx_questions_form_id on public.questions (form_id);

alter table public.forms enable row level security;
alter table public.questions enable row level security;

grant select, insert, update, delete on public.forms to authenticated;
grant select, insert, update, delete on public.questions to authenticated;

drop policy if exists "forms_admin_all" on public.forms;
create policy "forms_admin_all" on public.forms
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "questions_admin_all" on public.questions;
create policy "questions_admin_all" on public.questions
  for all using (public.is_admin()) with check (public.is_admin());

-- Participant-facing SELECT policies are intentionally NOT defined here.
-- Per docs/CONSTITUCION.md section 7 they depend on form_assignments
-- (out of scope this milestone) and status = 'published'; adding one now
-- would be untestable and premature. A later migration (Fase de asignación)
-- adds it — this file is not touched again for that purpose.

-- Atomic bulk reorder for drag & drop. Deliberately NOT security definer:
-- unlike get_invitation_by_token (004_invitations.sql, which bypasses RLS
-- for a pre-auth anon lookup), this runs as the calling authenticated role,
-- so questions_admin_all still gates it — it exists purely for atomicity
-- (one statement touching every row) via a single set-based UPDATE.
create or replace function public.reorder_questions(p_form_id uuid, p_question_ids uuid[])
returns void
language sql
set search_path = public
as $$
  update public.questions q
  set "order" = t.ord - 1, updated_at = now()
  from unnest(p_question_ids) with ordinality as t(id, ord)
  where q.id = t.id and q.form_id = p_form_id;
$$;

grant execute on function public.reorder_questions(uuid, uuid[]) to authenticated;
