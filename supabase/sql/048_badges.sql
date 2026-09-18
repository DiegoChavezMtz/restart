-- =============================================================================
-- 048_badges.sql — Insignias digitales verificables (Open Badges 3.0)
-- =============================================================================
-- Fuente de verdad funcional: docs/MODULO_BADGES.md.
-- Fase 1 (MVP Taller de CV): 1 issuer, 1 badge_class, otorgamiento por cohorte,
-- verificación pública sin login. Ver docs para el alcance completo.

create table if not exists public.badge_issuers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  url text,
  email text,
  image_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.badge_classes (
  id uuid primary key default gen_random_uuid(),
  issuer_id uuid not null references public.badge_issuers (id) on delete restrict,
  name text not null,
  description text not null default '',
  criteria text not null default '',
  image_url text,
  valid_months int,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_badge_classes_issuer_id on public.badge_classes (issuer_id);

create table if not exists public.badge_assertions (
  id uuid primary key default gen_random_uuid(),
  badge_class_id uuid not null references public.badge_classes (id) on delete restrict,
  recipient_id uuid not null references public.users (id) on delete cascade,
  issued_at timestamptz not null default now(),
  expires_at timestamptz,
  status text not null default 'active' check (status in ('active', 'revoked')),
  revoked_at timestamptz,
  revoked_by uuid references public.users (id),
  issued_by uuid not null references public.users (id),
  check ((status = 'revoked') = (revoked_at is not null)),
  unique (badge_class_id, recipient_id)
);

create index if not exists idx_badge_assertions_recipient_id on public.badge_assertions (recipient_id);
create index if not exists idx_badge_assertions_badge_class_id on public.badge_assertions (badge_class_id);

alter table public.badge_issuers enable row level security;
alter table public.badge_classes enable row level security;
alter table public.badge_assertions enable row level security;

grant select on public.badge_issuers to anon, authenticated;
grant select on public.badge_classes to anon, authenticated;
grant insert, update on public.badge_issuers to authenticated;
grant insert, update on public.badge_classes to authenticated;
grant select, insert, update on public.badge_assertions to authenticated;

-- Issuers / classes: lectura pública (catálogo + página de verificación),
-- escritura solo admin. Reusa public.is_admin() de 028_roles_and_capabilities.sql.
drop policy if exists badge_issuers_read on public.badge_issuers;
create policy badge_issuers_read on public.badge_issuers for select using (true);
drop policy if exists badge_issuers_admin_write on public.badge_issuers;
create policy badge_issuers_admin_write on public.badge_issuers for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists badge_classes_read on public.badge_classes;
create policy badge_classes_read on public.badge_classes for select using (true);
drop policy if exists badge_classes_admin_write on public.badge_classes;
create policy badge_classes_admin_write on public.badge_classes for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Assertions: el dueño ve las suyas, admin ve/otorga/revoca todas. El público
-- (sin sesión) NO tiene acceso directo a la tabla — solo a través de la función
-- SECURITY DEFINER get_public_badge_assertion, que expone el mínimo necesario.
drop policy if exists badge_assertions_owner_select on public.badge_assertions;
create policy badge_assertions_owner_select on public.badge_assertions for select to authenticated
  using (recipient_id = auth.uid());
drop policy if exists badge_assertions_admin_all on public.badge_assertions;
create policy badge_assertions_admin_all on public.badge_assertions for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Función pública de verificación: expone solo lo necesario para validar una
-- credencial (nombre del destinatario, datos del badge y del issuer). No
-- expone email, cohort_id ni ningún otro dato del perfil del participante.
create or replace function public.get_public_badge_assertion(p_id uuid)
returns table (
  assertion_id uuid,
  status text,
  issued_at timestamptz,
  expires_at timestamptz,
  recipient_name text,
  badge_class_id uuid,
  badge_name text,
  badge_description text,
  badge_criteria text,
  badge_image_url text,
  issuer_name text,
  issuer_url text,
  issuer_image_url text
)
language sql
security definer
set search_path = public
stable
as $$
  select
    a.id, a.status, a.issued_at, a.expires_at,
    u.full_name,
    bc.id, bc.name, bc.description, bc.criteria, bc.image_url,
    bi.name, bi.url, bi.image_url
  from public.badge_assertions a
  join public.users u on u.id = a.recipient_id
  join public.badge_classes bc on bc.id = a.badge_class_id
  join public.badge_issuers bi on bi.id = bc.issuer_id
  where a.id = p_id;
$$;

grant execute on function public.get_public_badge_assertion(uuid) to anon, authenticated;

-- Storage — bucket público para imágenes de badges. Público porque la imagen
-- debe verse sin login en /badges/verify/[id] y dentro del JSON Open Badges
-- (badge.image) que consumen LinkedIn y terceros.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'badge-images',
  'badge-images',
  true,
  1048576, -- 1 MB
  array['image/svg+xml', 'image/png']
)
on conflict (id) do nothing;

drop policy if exists badge_images_storage_admin_write on storage.objects;
create policy badge_images_storage_admin_write
  on storage.objects for insert to authenticated
  with check (bucket_id = 'badge-images' and public.is_admin());
drop policy if exists badge_images_storage_admin_update_delete on storage.objects;
create policy badge_images_storage_admin_update_delete
  on storage.objects for all to authenticated
  using (bucket_id = 'badge-images' and public.is_admin())
  with check (bucket_id = 'badge-images' and public.is_admin());
drop policy if exists badge_images_storage_public_read on storage.objects;
create policy badge_images_storage_public_read
  on storage.objects for select
  using (bucket_id = 'badge-images');

-- Seed del MVP: issuer único (no hay UI de administración de issuers en esta
-- fase — el badge_class del Taller de CV se crea desde /admin/badges/classes/new).
insert into public.badge_issuers (id, name, url, email)
values (
  '00000000-0000-0000-0000-000000000001',
  'JCF / Restart',
  'https://app.empiezadiferente.com',
  null
)
on conflict (id) do nothing;
