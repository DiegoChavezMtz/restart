-- =============================================================================
-- 027_form_archiving.sql — Archivado reversible de formularios
-- =============================================================================
-- Se conserva el historial y las respuestas: archivar no elimina registros.

alter table public.forms drop constraint if exists forms_status_check;
alter table public.forms add constraint forms_status_check
  check (status in ('draft', 'published', 'closed', 'archived'));

create or replace function public.close_archived_form_responses()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status = 'archived' then
    new.accepting_responses := false;
  end if;
  return new;
end;
$$;

drop trigger if exists close_archived_form_responses on public.forms;
create trigger close_archived_form_responses
  before update of status on public.forms
  for each row execute function public.close_archived_form_responses();
