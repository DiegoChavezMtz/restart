-- =============================================================================
-- 019_appointment_internal_forms.sql — Plantillas internas, snapshots y respuestas
-- =============================================================================

alter table public.forms
  add column if not exists purpose text not null default 'participant';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'forms_purpose_check'
  ) then
    alter table public.forms add constraint forms_purpose_check
      check (purpose in ('participant', 'appointment_internal'));
  end if;
end;
$$;

-- Las plantillas internas no participan en asignaciones/respuestas de alumnos.
create or replace function public.reject_internal_form_participant_flow()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_form_id uuid;
begin
  v_form_id := new.form_id;
  if exists (
    select 1 from public.forms f
    where f.id = v_form_id and f.purpose = 'appointment_internal'
  ) then
    raise exception 'los formularios internos no pueden asignarse ni responderse por participantes';
  end if;
  return new;
end;
$$;

drop trigger if exists reject_internal_form_assignment on public.form_assignments;
create trigger reject_internal_form_assignment
  before insert or update on public.form_assignments
  for each row execute function public.reject_internal_form_participant_flow();

drop trigger if exists reject_internal_form_response on public.form_responses;
create trigger reject_internal_form_response
  before insert or update of form_id on public.form_responses
  for each row execute function public.reject_internal_form_participant_flow();

create or replace function public.protect_form_purpose()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.purpose is distinct from old.purpose then
    raise exception 'el propósito de un formulario no puede cambiarse; duplíquelo';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_form_purpose on public.forms;
create trigger protect_form_purpose
  before update of purpose on public.forms
  for each row execute function public.protect_form_purpose();

-- Conserva purpose al duplicar; la implementación original anterior a este
-- módulo dejaba que una plantilla interna se convirtiera en formulario público.
create or replace function public.duplicate_form(p_form_id uuid, p_created_by uuid)
returns uuid
language plpgsql
as $$
declare
  new_form_id uuid;
begin
  insert into public.forms (
    title, description, status, accepting_responses, allows_partial_save,
    deadline_at, created_by, purpose
  )
  select title, description, 'draft', accepting_responses, allows_partial_save,
    deadline_at, p_created_by, purpose
  from public.forms
  where id = p_form_id
  returning id into new_form_id;

  create temporary table _question_id_map (old_id uuid, new_id uuid) on commit drop;
  insert into _question_id_map (old_id, new_id)
  select q.id, gen_random_uuid() from public.questions q where q.form_id = p_form_id;

  insert into public.questions
    (id, form_id, "order", label, type, config, required, time_limit_seconds)
  select m.new_id, new_form_id, q."order", q.label, q.type, q.config,
    q.required, q.time_limit_seconds
  from public.questions q join _question_id_map m on m.old_id = q.id;

  create temporary table _skill_id_map (old_id uuid, new_id uuid) on commit drop;
  insert into _skill_id_map (old_id, new_id)
  select s.id, gen_random_uuid() from public.form_skills s where s.form_id = p_form_id;

  insert into public.form_skills (id, form_id, name, description, icon, color)
  select m.new_id, new_form_id, s.name, s.description, s.icon, s.color
  from public.form_skills s join _skill_id_map m on m.old_id = s.id;

  insert into public.question_skill_weights (question_id, skill_id, weight)
  select qm.new_id, sm.new_id, w.weight
  from public.question_skill_weights w
  join _question_id_map qm on qm.old_id = w.question_id
  join _skill_id_map sm on sm.old_id = w.skill_id;

  return new_form_id;
end;
$$;

create table if not exists public.appointment_form_instances (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments (id) on delete cascade,
  source_form_id uuid references public.forms (id) on delete set null,
  title text not null check (btrim(title) <> ''),
  status text not null default 'in_progress' check (status in ('in_progress', 'completed')),
  created_by uuid not null references public.users (id),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (status = 'completed' and completed_at is not null)
    or (status = 'in_progress' and completed_at is null)
  )
);

create table if not exists public.appointment_form_question_snapshots (
  id uuid primary key default gen_random_uuid(),
  form_instance_id uuid not null references public.appointment_form_instances (id) on delete cascade,
  source_question_id uuid references public.questions (id) on delete set null,
  "order" integer not null check ("order" >= 0),
  label text not null,
  type text not null check (type in ('likert', 'open_text', 'single_choice', 'checkbox')),
  config jsonb not null,
  required boolean not null default true,
  time_limit_seconds integer,
  unique (form_instance_id, "order"),
  unique (id, form_instance_id)
);

create table if not exists public.appointment_form_answers (
  id uuid primary key default gen_random_uuid(),
  form_instance_id uuid not null references public.appointment_form_instances (id) on delete cascade,
  question_snapshot_id uuid not null references public.appointment_form_question_snapshots (id) on delete cascade,
  value jsonb,
  last_edited_by uuid not null references public.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (form_instance_id, question_snapshot_id),
  foreign key (question_snapshot_id, form_instance_id)
    references public.appointment_form_question_snapshots (id, form_instance_id)
    on delete cascade
);

create index if not exists idx_appointment_form_instances_appointment
  on public.appointment_form_instances (appointment_id, created_at);
create index if not exists idx_appointment_form_snapshots_instance
  on public.appointment_form_question_snapshots (form_instance_id, "order");

-- Crea una instancia y congela la plantilla en la misma transacción.
create or replace function public.create_appointment_form_instance(
  p_appointment_id uuid,
  p_source_form_id uuid default null,
  p_title text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_instance_id uuid;
  v_title text;
begin
  if not public.is_appointment_owner(p_appointment_id) then
    raise exception 'solo el mentor propietario puede agregar formularios';
  end if;

  if p_source_form_id is not null then
    select f.title into v_title from public.forms f
    where f.id = p_source_form_id and f.purpose = 'appointment_internal';
    if not found then
      raise exception 'plantilla interna inexistente';
    end if;
  else
    v_title := nullif(btrim(p_title), '');
    if v_title is null then
      raise exception 'el título es obligatorio para formularios exclusivos';
    end if;
  end if;

  insert into public.appointment_form_instances
    (appointment_id, source_form_id, title, created_by)
  values (p_appointment_id, p_source_form_id, coalesce(nullif(btrim(p_title), ''), v_title), auth.uid())
  returning id into v_instance_id;

  if p_source_form_id is not null then
    insert into public.appointment_form_question_snapshots (
      form_instance_id, source_question_id, "order", label, type,
      config, required, time_limit_seconds
    )
    select v_instance_id, q.id, q."order", q.label, q.type,
      q.config, q.required, q.time_limit_seconds
    from public.questions q
    where q.form_id = p_source_form_id
    order by q."order";
  end if;

  return v_instance_id;
end;
$$;

revoke all on function public.create_appointment_form_instance(uuid, uuid, text) from public;
grant execute on function public.create_appointment_form_instance(uuid, uuid, text) to authenticated;

alter table public.appointment_form_instances enable row level security;
alter table public.appointment_form_question_snapshots enable row level security;
alter table public.appointment_form_answers enable row level security;

grant select, insert, update, delete on public.appointment_form_instances to authenticated;
grant select, insert, update, delete on public.appointment_form_question_snapshots to authenticated;
grant select, insert, update, delete on public.appointment_form_answers to authenticated;

-- Reemplaza la policy amplia de forms para restringir plantillas internas al creador.
drop policy if exists "forms_admin_all" on public.forms;
drop policy if exists forms_admin_select on public.forms;
create policy forms_admin_select on public.forms
  for select to authenticated using (public.is_admin());
drop policy if exists forms_admin_insert on public.forms;
create policy forms_admin_insert on public.forms
  for insert to authenticated with check (public.is_admin() and created_by = auth.uid());
drop policy if exists forms_admin_update on public.forms;
create policy forms_admin_update on public.forms
  for update to authenticated
  using (public.is_admin() and (purpose = 'participant' or created_by = auth.uid()))
  with check (public.is_admin() and (purpose = 'participant' or created_by = auth.uid()));
drop policy if exists forms_admin_delete on public.forms;
create policy forms_admin_delete on public.forms
  for delete to authenticated
  using (public.is_admin() and (purpose = 'participant' or created_by = auth.uid()));

-- Questions hereda la propiedad de su formulario.
drop policy if exists "questions_admin_all" on public.questions;
drop policy if exists questions_admin_select on public.questions;
create policy questions_admin_select on public.questions
  for select to authenticated using (public.is_admin());
drop policy if exists questions_admin_insert on public.questions;
create policy questions_admin_insert on public.questions
  for insert to authenticated with check (exists (
    select 1 from public.forms f where f.id = form_id and public.is_admin()
      and (f.purpose = 'participant' or f.created_by = auth.uid())
  ));
drop policy if exists questions_admin_update on public.questions;
create policy questions_admin_update on public.questions
  for update to authenticated
  using (exists (
    select 1 from public.forms f where f.id = form_id and public.is_admin()
      and (f.purpose = 'participant' or f.created_by = auth.uid())
  )) with check (exists (
    select 1 from public.forms f where f.id = form_id and public.is_admin()
      and (f.purpose = 'participant' or f.created_by = auth.uid())
  ));
drop policy if exists questions_admin_delete on public.questions;
create policy questions_admin_delete on public.questions
  for delete to authenticated using (exists (
    select 1 from public.forms f where f.id = form_id and public.is_admin()
      and (f.purpose = 'participant' or f.created_by = auth.uid())
  ));

-- La misma propiedad se propaga a skills, weights y ramas de la plantilla.
drop policy if exists "form_skills_admin_all" on public.form_skills;
drop policy if exists form_skills_admin_select on public.form_skills;
create policy form_skills_admin_select on public.form_skills
  for select to authenticated using (public.is_admin());
drop policy if exists form_skills_admin_write on public.form_skills;
create policy form_skills_admin_write on public.form_skills
  for all to authenticated
  using (exists (
    select 1 from public.forms f where f.id = form_id and public.is_admin()
      and (f.purpose = 'participant' or f.created_by = auth.uid())
  )) with check (exists (
    select 1 from public.forms f where f.id = form_id and public.is_admin()
      and (f.purpose = 'participant' or f.created_by = auth.uid())
  ));

drop policy if exists "question_skill_weights_admin_all" on public.question_skill_weights;
drop policy if exists question_skill_weights_admin_select on public.question_skill_weights;
create policy question_skill_weights_admin_select on public.question_skill_weights
  for select to authenticated using (public.is_admin());
drop policy if exists question_skill_weights_admin_write on public.question_skill_weights;
create policy question_skill_weights_admin_write on public.question_skill_weights
  for all to authenticated
  using (exists (
    select 1 from public.questions q join public.forms f on f.id = q.form_id
    where q.id = question_id and public.is_admin()
      and (f.purpose = 'participant' or f.created_by = auth.uid())
  )) with check (exists (
    select 1 from public.questions q join public.forms f on f.id = q.form_id
    where q.id = question_id and public.is_admin()
      and (f.purpose = 'participant' or f.created_by = auth.uid())
  ));

drop policy if exists "question_option_branches_admin_all" on public.question_option_branches;
drop policy if exists question_option_branches_admin_select on public.question_option_branches;
create policy question_option_branches_admin_select on public.question_option_branches
  for select to authenticated using (public.is_admin());
drop policy if exists question_option_branches_admin_write on public.question_option_branches;
create policy question_option_branches_admin_write on public.question_option_branches
  for all to authenticated
  using (exists (
    select 1 from public.questions q join public.forms f on f.id = q.form_id
    where q.id = question_id and public.is_admin()
      and (f.purpose = 'participant' or f.created_by = auth.uid())
  )) with check (exists (
    select 1 from public.questions q join public.forms f on f.id = q.form_id
    where q.id = question_id and public.is_admin()
      and (f.purpose = 'participant' or f.created_by = auth.uid())
  ));

drop policy if exists appointment_form_instances_admin_select on public.appointment_form_instances;
create policy appointment_form_instances_admin_select on public.appointment_form_instances
  for select to authenticated using (public.can_read_appointment_follow_up(appointment_id));
drop policy if exists appointment_form_instances_owner_all on public.appointment_form_instances;
create policy appointment_form_instances_owner_all on public.appointment_form_instances
  for all to authenticated
  using (public.is_appointment_owner(appointment_id))
  with check (public.is_appointment_owner(appointment_id) and created_by = auth.uid());

drop policy if exists appointment_form_snapshots_admin_select on public.appointment_form_question_snapshots;
create policy appointment_form_snapshots_admin_select on public.appointment_form_question_snapshots
  for select to authenticated using (exists (
    select 1 from public.appointment_form_instances i
    where i.id = form_instance_id and public.can_read_appointment_follow_up(i.appointment_id)
  ));
drop policy if exists appointment_form_snapshots_owner_all on public.appointment_form_question_snapshots;
create policy appointment_form_snapshots_owner_all on public.appointment_form_question_snapshots
  for all to authenticated
  using (exists (
    select 1 from public.appointment_form_instances i
    where i.id = form_instance_id and public.is_appointment_owner(i.appointment_id)
  )) with check (exists (
    select 1 from public.appointment_form_instances i
    where i.id = form_instance_id and public.is_appointment_owner(i.appointment_id)
  ));

drop policy if exists appointment_form_answers_admin_select on public.appointment_form_answers;
create policy appointment_form_answers_admin_select on public.appointment_form_answers
  for select to authenticated using (exists (
    select 1 from public.appointment_form_instances i
    where i.id = form_instance_id and public.can_read_appointment_follow_up(i.appointment_id)
  ));
drop policy if exists appointment_form_answers_owner_all on public.appointment_form_answers;
create policy appointment_form_answers_owner_all on public.appointment_form_answers
  for all to authenticated
  using (exists (
    select 1 from public.appointment_form_instances i
    where i.id = form_instance_id and public.is_appointment_owner(i.appointment_id)
  )) with check (exists (
    select 1 from public.appointment_form_instances i
    where i.id = form_instance_id and public.is_appointment_owner(i.appointment_id)
  ) and last_edited_by = auth.uid());
