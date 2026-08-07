-- =============================================================================
-- 036_admin_non_sensitive_appointment_cancellation.sql
-- Admin gestiona agenda no sensible sin adquirir acceso a seguimiento clínico.
-- =============================================================================

create or replace function public.cancel_appointment(p_appointment_id uuid, p_reason text default null)
returns void language plpgsql security definer set search_path = public as $$
declare v_appointment public.appointments%rowtype; v_is_participant boolean; v_is_staff_manager boolean;
begin
  select * into v_appointment from public.appointments a where a.id = p_appointment_id for update;
  if not found or v_appointment.status <> 'reserved' then raise exception 'la cita no existe o ya no está reservada'; end if;
  v_is_participant := v_appointment.participant_id = auth.uid();
  v_is_staff_manager := public.is_super_admin() or public.is_appointment_owner(p_appointment_id)
    or (public.is_admin() and not public.is_sensitive_appointment(p_appointment_id));
  if not v_is_participant and not v_is_staff_manager then raise exception 'no autorizado para cancelar esta cita'; end if;
  if v_is_participant and v_appointment.starts_at < now() + interval '2 hours' then raise exception 'la cita solo puede cancelarse con al menos 2 horas de anticipación'; end if;
  update public.appointments set status = case when v_is_participant then 'cancelled_by_participant' else 'cancelled_by_admin' end,
    cancelled_at = now(), cancelled_by = auth.uid(), updated_at = now() where id = p_appointment_id;
  update public.appointment_slots set status = case when v_is_participant and v_appointment.starts_at >= now() + interval '24 hours' then 'available' else 'withdrawn' end,
    updated_at = now() where id = v_appointment.slot_id;
  update public.appointment_status_history set reason = p_reason where id = (
    select h.id from public.appointment_status_history h where h.appointment_id = p_appointment_id order by h.created_at desc limit 1
  );
end;
$$;
