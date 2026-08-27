-- =============================================================================
-- 045_employment_llm_control.sql — Interruptor global y caché privada de IA
-- =============================================================================
-- Ejecutar después de 044. El interruptor es administrable exclusivamente por
-- super_admin; la caché queda aislada por usuario y no contiene prompts crudos.

create table if not exists public.employment_llm_settings (
  singleton boolean primary key default true check (singleton),
  minimax_enabled boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.users(id) on delete set null
);

insert into public.employment_llm_settings (singleton, minimax_enabled)
values (true, true) on conflict (singleton) do nothing;

create or replace function public.is_employment_llm_enabled()
returns boolean language sql security definer set search_path = public stable as $$
  select coalesce((select minimax_enabled from public.employment_llm_settings where singleton = true), false);
$$;

create or replace function public.touch_employment_llm_setting()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not public.is_super_admin() then raise exception 'solo super_admin puede cambiar la IA'; end if;
  new.singleton := true; new.updated_at := now(); new.updated_by := auth.uid();
  return new;
end;
$$;
drop trigger if exists touch_employment_llm_setting on public.employment_llm_settings;
create trigger touch_employment_llm_setting before insert or update on public.employment_llm_settings
for each row execute function public.touch_employment_llm_setting();

alter table public.employment_llm_settings enable row level security;
grant select, update on public.employment_llm_settings to authenticated;
drop policy if exists employment_llm_settings_super_admin on public.employment_llm_settings;
create policy employment_llm_settings_super_admin on public.employment_llm_settings for all to authenticated
using (public.is_super_admin()) with check (public.is_super_admin());

create table if not exists public.employment_llm_cache (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  cache_key text not null,
  task text not null,
  prompt_version text not null,
  model text not null,
  output jsonb not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (user_id, cache_key)
);
create index if not exists idx_employment_llm_cache_lookup on public.employment_llm_cache (user_id, cache_key, expires_at);
alter table public.employment_llm_cache enable row level security;
grant select, insert, update, delete on public.employment_llm_cache to authenticated;
drop policy if exists employment_llm_cache_owner_all on public.employment_llm_cache;
create policy employment_llm_cache_owner_all on public.employment_llm_cache for all to authenticated
using (user_id = auth.uid()) with check (user_id = auth.uid());
