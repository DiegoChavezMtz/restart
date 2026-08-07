-- =============================================================================
-- 020_appointment_integrations.sql — Google Calendar e notificaciones internas
-- =============================================================================
-- access_token_encrypted/refresh_token_encrypted deben cifrarse en la capa server;
-- nunca se guardan tokens OAuth en texto plano ni se exponen al navegador.

create table if not exists public.mentor_google_connections (
  mentor_id uuid primary key references public.users (id) on delete cascade,
  google_account_email text not null,
  access_token_encrypted text not null,
  refresh_token_encrypted text,
  token_expires_at timestamptz,
  scopes text[] not null default '{}',
  status text not null default 'connected' check (status in ('connected', 'expired', 'revoked', 'error')),
  connected_at timestamptz not null default now(),
  last_synced_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.appointment_calendar_syncs (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments (id) on delete cascade,
  operation text not null check (operation in ('create', 'cancel', 'retry', 'manual_link')),
  status text not null default 'pending' check (status in ('pending', 'succeeded', 'failed')),
  google_event_id text,
  meeting_url text,
  error_message text,
  attempt_number integer not null default 1 check (attempt_number > 0),
  requested_by uuid not null references public.users (id),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.internal_notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.users (id) on delete cascade,
  type text not null,
  title text not null,
  body text not null,
  related_entity_type text,
  related_entity_id uuid,
  deduplication_key text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists uq_internal_notifications_deduplication
  on public.internal_notifications (recipient_id, deduplication_key)
  where deduplication_key is not null;
create index if not exists idx_internal_notifications_unread
  on public.internal_notifications (recipient_id, created_at desc)
  where read_at is null;
create index if not exists idx_calendar_syncs_appointment
  on public.appointment_calendar_syncs (appointment_id, created_at desc);

-- Encola creación/cancelación automáticamente; un worker server-side procesa
-- los pendientes contra Google y registra el resultado con la RPC inferior.
create or replace function public.enqueue_appointment_calendar_sync()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_operation text;
  v_attempt integer;
begin
  if tg_op = 'INSERT' then
    v_operation := 'create';
  elsif new.status in ('cancelled_by_participant', 'cancelled_by_admin')
        and new.status is distinct from old.status then
    v_operation := 'cancel';
  else
    return new;
  end if;

  select coalesce(max(s.attempt_number), 0) + 1 into v_attempt
  from public.appointment_calendar_syncs s where s.appointment_id = new.id;

  insert into public.appointment_calendar_syncs
    (appointment_id, operation, status, attempt_number, requested_by)
  values (
    new.id, v_operation, 'pending', v_attempt,
    coalesce(auth.uid(), new.cancelled_by, new.booked_by)
  );
  return new;
end;
$$;

drop trigger if exists enqueue_appointment_calendar_sync on public.appointments;
create trigger enqueue_appointment_calendar_sync
  after insert or update of status on public.appointments
  for each row execute function public.enqueue_appointment_calendar_sync();

create or replace function public.record_appointment_calendar_result(
  p_appointment_id uuid,
  p_operation text,
  p_status text,
  p_google_event_id text default null,
  p_meeting_url text default null,
  p_error_message text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sync_id uuid;
  v_attempt integer;
begin
  if not public.is_appointment_owner(p_appointment_id) then
    raise exception 'solo el mentor propietario puede sincronizar la cita';
  end if;
  if p_operation not in ('create', 'cancel', 'retry', 'manual_link')
     or p_status not in ('pending', 'succeeded', 'failed') then
    raise exception 'resultado de sincronización inválido';
  end if;

  select coalesce(max(s.attempt_number), 0) + 1 into v_attempt
  from public.appointment_calendar_syncs s
  where s.appointment_id = p_appointment_id;

  insert into public.appointment_calendar_syncs (
    appointment_id, operation, status, google_event_id, meeting_url,
    error_message, attempt_number, requested_by, completed_at
  ) values (
    p_appointment_id, p_operation, p_status, p_google_event_id,
    p_meeting_url, left(p_error_message, 1000), v_attempt, auth.uid(),
    case when p_status = 'pending' then null else now() end
  ) returning id into v_sync_id;

  if p_status = 'succeeded' and p_meeting_url is not null
     and p_operation in ('create', 'retry', 'manual_link') then
    update public.appointments
    set remote_meeting_url = p_meeting_url, updated_at = now()
    where id = p_appointment_id and modality = 'remote';
  end if;

  return v_sync_id;
end;
$$;

revoke all on function public.record_appointment_calendar_result(uuid, text, text, text, text, text) from public;
grant execute on function public.record_appointment_calendar_result(uuid, text, text, text, text, text) to authenticated;

alter table public.mentor_google_connections enable row level security;
alter table public.appointment_calendar_syncs enable row level security;
alter table public.internal_notifications enable row level security;

grant select, insert, update, delete on public.mentor_google_connections to authenticated;
grant select, insert on public.appointment_calendar_syncs to authenticated;
grant select, update on public.internal_notifications to authenticated;

drop policy if exists google_connections_owner_all on public.mentor_google_connections;
create policy google_connections_owner_all on public.mentor_google_connections
  for all to authenticated
  using (mentor_id = auth.uid() and public.is_admin())
  with check (mentor_id = auth.uid() and public.is_admin());

drop policy if exists calendar_syncs_owner_select on public.appointment_calendar_syncs;
create policy calendar_syncs_owner_select on public.appointment_calendar_syncs
  for select to authenticated using (exists (
    select 1 from public.appointments a
    where a.id = appointment_id and a.mentor_id = auth.uid()
  ));

drop policy if exists notifications_owner_select on public.internal_notifications;
create policy notifications_owner_select on public.internal_notifications
  for select to authenticated using (recipient_id = auth.uid());
drop policy if exists notifications_owner_update on public.internal_notifications;
create policy notifications_owner_update on public.internal_notifications
  for update to authenticated
  using (recipient_id = auth.uid()) with check (recipient_id = auth.uid());
