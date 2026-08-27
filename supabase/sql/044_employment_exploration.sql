-- =============================================================================
-- 044_employment_exploration.sql  —  Módulo de empleabilidad: Descúbrete
-- =============================================================================
-- Idempotente. Correr manualmente en el SQL Editor DESPUÉS de
-- 043_employment_applications.sql. Ver docs/MODULO_EMPLEO.md para el diseño
-- completo.
--
-- 100% privado: ni admin ni psicóloga tienen policy de lectura sobre estas
-- tablas en v1 — solo el propio usuario ve sus conversaciones y hallazgos.
-- =============================================================================


-- 1. Sesiones ---------------------------------------------------------------------
create table if not exists public.exploration_sessions (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references public.users (id) on delete cascade,
  status                text not null default 'active'
                          check (status in ('active', 'completed', 'paused')),
  started_at            timestamptz not null default now(),
  last_interaction_at   timestamptz not null default now()
);
create index if not exists idx_exploration_sessions_user_id on public.exploration_sessions (user_id);


-- 2. Mensajes -----------------------------------------------------------------------
create table if not exists public.exploration_messages (
  id           uuid primary key default gen_random_uuid(),
  session_id   uuid not null references public.exploration_sessions (id) on delete cascade,
  role         text not null check (role in ('assistant', 'user')),
  content      text not null,
  created_at   timestamptz not null default now()
);
create index if not exists idx_exploration_messages_session_id on public.exploration_messages (session_id);


-- 3. Hallazgos (insights) ------------------------------------------------------------
create table if not exists public.exploration_insights (
  id                 uuid primary key default gen_random_uuid(),
  session_id         uuid not null references public.exploration_sessions (id) on delete cascade,
  user_id            uuid not null references public.users (id) on delete cascade,
  category           text not null
                       check (category in ('value', 'interest', 'strength', 'work_preference', 'constraint', 'goal')),
  content            text not null,
  source_message_id  uuid references public.exploration_messages (id) on delete set null,
  status             text not null default 'pending_review'
                       check (status in ('pending_review', 'accepted', 'dismissed')),
  created_at         timestamptz not null default now()
);
create index if not exists idx_exploration_insights_user_id on public.exploration_insights (user_id);
create index if not exists idx_exploration_insights_session_id on public.exploration_insights (session_id);


-- 4. Trigger — mantiene last_interaction_at al día en cada mensaje nuevo --------------
create or replace function public.touch_exploration_session_on_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.exploration_sessions
  set last_interaction_at = now()
  where id = new.session_id;
  return new;
end;
$$;

drop trigger if exists touch_exploration_session_on_message on public.exploration_messages;
create trigger touch_exploration_session_on_message
  after insert on public.exploration_messages
  for each row execute function public.touch_exploration_session_on_message();


-- 5. RLS ----------------------------------------------------------------------
alter table public.exploration_sessions enable row level security;
alter table public.exploration_messages enable row level security;
alter table public.exploration_insights enable row level security;

grant select, insert, update, delete on public.exploration_sessions to authenticated;
grant select, insert, update, delete on public.exploration_messages to authenticated;
grant select, insert, update, delete on public.exploration_insights to authenticated;

-- 5.1 exploration_sessions: dueño total
drop policy if exists exploration_sessions_owner_all on public.exploration_sessions;
create policy exploration_sessions_owner_all
  on public.exploration_sessions for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- 5.2 exploration_messages: dueño total vía exploration_sessions.user_id
drop policy if exists exploration_messages_owner_all on public.exploration_messages;
create policy exploration_messages_owner_all
  on public.exploration_messages for all to authenticated
  using (exists (
    select 1 from public.exploration_sessions s
    where s.id = session_id and s.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.exploration_sessions s
    where s.id = session_id and s.user_id = auth.uid()
  ));

-- 5.3 exploration_insights: dueño total
drop policy if exists exploration_insights_owner_all on public.exploration_insights;
create policy exploration_insights_owner_all
  on public.exploration_insights for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());


-- =============================================================================
-- Verificar tras correr:
--   select tablename, policyname from pg_policies
--   where tablename in ('exploration_sessions','exploration_messages','exploration_insights');
-- =============================================================================
