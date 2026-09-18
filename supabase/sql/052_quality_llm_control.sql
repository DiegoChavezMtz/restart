-- Interruptor independiente para IA de Calidad. Inicia apagado para evitar
-- cualquier consumo de MiniMax hasta que un super_admin lo autorice.
create table if not exists public.quality_llm_settings (
  singleton boolean primary key default true check (singleton),
  minimax_enabled boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.users(id) on delete set null
);

insert into public.quality_llm_settings (singleton, minimax_enabled)
values (true, false) on conflict (singleton) do nothing;

create or replace function public.is_quality_llm_enabled()
returns boolean language sql security definer set search_path = public stable as $$
  select coalesce((select minimax_enabled from public.quality_llm_settings where singleton = true), false);
$$;

create or replace function public.touch_quality_llm_setting()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not public.is_super_admin() then raise exception 'solo super_admin puede cambiar la IA de calidad'; end if;
  new.singleton := true; new.updated_at := now(); new.updated_by := auth.uid();
  return new;
end;
$$;

drop trigger if exists touch_quality_llm_setting on public.quality_llm_settings;
create trigger touch_quality_llm_setting before insert or update on public.quality_llm_settings
for each row execute function public.touch_quality_llm_setting();

alter table public.quality_llm_settings enable row level security;
grant select, update on public.quality_llm_settings to authenticated;
drop policy if exists quality_llm_settings_super_admin on public.quality_llm_settings;
create policy quality_llm_settings_super_admin on public.quality_llm_settings for all to authenticated
using (public.is_super_admin()) with check (public.is_super_admin());
