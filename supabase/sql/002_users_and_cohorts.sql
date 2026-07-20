-- Idempotent: safe to re-run.

create table if not exists public.cohorts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  full_name text not null,
  role text not null default 'participant' check (role in ('admin', 'participant')),
  cohort_id uuid references public.cohorts (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_users_cohort_id on public.users (cohort_id);

alter table public.cohorts enable row level security;
alter table public.users enable row level security;
