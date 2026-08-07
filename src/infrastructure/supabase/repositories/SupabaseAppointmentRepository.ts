import type { Appointment, AppointmentSlot, AppointmentStatus, AppointmentType } from "@/domain/entities";
import { UseCaseError } from "@/application/errors";
import { createServerSupabaseClient } from "../client";

type Row = Record<string, unknown>;
const typeValue = (value: unknown): AppointmentType => value as AppointmentType;
const duration = (value: unknown): 30 | 60 | 90 | 120 => Number(value) as 30 | 60 | 90 | 120;

function fullName(value: unknown): string {
  return value && typeof value === "object" && "full_name" in value && typeof value.full_name === "string" ? value.full_name : "Sin asignar";
}

function related(value: unknown, key: string): unknown {
  return value && typeof value === "object" && key in value ? (value as Record<string, unknown>)[key] : undefined;
}

function mapAppointment(row: Row): Appointment {
  return {
    id: String(row.id), slotId: String(row.slot_id), participantId: String(row.participant_id),
    participantName: fullName(row.participant), participantCohortName: typeof row.participant_cohort_name === "string" ? row.participant_cohort_name : "Sin cohorte",
    mentorId: String(row.mentor_id), mentorName: fullName(row.mentor),
    appointmentType: typeValue(related(row.appointment_type, "normalized_name")), appointmentTypeLabel: String(row.appointment_type_name),
    startsAt: String(row.starts_at), endsAt: String(row.ends_at), durationMinutes: duration(row.duration_minutes),
    modality: row.modality === "in_person" ? "in_person" : "remote", locationText: typeof row.location_text === "string" ? row.location_text : null,
    remoteMeetingUrl: typeof row.remote_meeting_url === "string" ? row.remote_meeting_url : null,
    status: row.status as AppointmentStatus, tags: [], notes: null, createdAt: String(row.created_at),
  };
}

function mapSlot(row: Row): AppointmentSlot {
  const mappings = Array.isArray(row.cohorts) ? row.cohorts : [];
  return {
    id: String(row.id), mentorId: String(row.mentor_id), mentorName: fullName(row.mentor),
    appointmentType: typeValue(related(row.appointment_type, "normalized_name")), appointmentTypeLabel: typeof related(row.appointment_type, "name") === "string" ? String(related(row.appointment_type, "name")) : "Cita",
    startsAt: String(row.starts_at), endsAt: String(row.ends_at), durationMinutes: duration(row.duration_minutes),
    modality: row.modality === "in_person" ? "in_person" : "remote", locationText: typeof row.location_text === "string" ? row.location_text : null,
    cohortIds: mappings.map((item) => item && typeof item === "object" && "cohort_id" in item ? String(item.cohort_id) : "").filter(Boolean),
    status: row.status === "booked" ? "booked" : row.status === "expired" ? "expired" : row.status === "withdrawn" ? "withdrawn" : "available",
  };
}

const appointmentSelect = "*,participant:users!appointments_participant_id_fkey(full_name),mentor:users!appointments_mentor_id_fkey(full_name),appointment_type:appointment_types(normalized_name)";
const slotSelect = "*,mentor:users!appointment_slots_mentor_id_fkey(full_name),appointment_type:appointment_types(name,normalized_name),cohorts:appointment_slot_cohorts(cohort_id)";

export class SupabaseAppointmentRepository {
  async listAppointments(accessToken: string): Promise<Appointment[]> {
    const { data, error } = await createServerSupabaseClient(accessToken).from("appointments").select(appointmentSelect).order("starts_at", { ascending: true });
    if (error) throw new UseCaseError(error.message, 500);
    return (data ?? []).map((row) => mapAppointment(row as Row));
  }

  async listSlots(accessToken: string): Promise<AppointmentSlot[]> {
    const { data, error } = await createServerSupabaseClient(accessToken).from("appointment_slots").select(slotSelect).order("starts_at", { ascending: true });
    if (error) throw new UseCaseError(error.message, 500);
    return (data ?? []).map((row) => mapSlot(row as Row));
  }

  async reserve(slotId: string, accessToken: string): Promise<Appointment> {
    const client = createServerSupabaseClient(accessToken);
    const { data: id, error } = await client.rpc("reserve_appointment", { p_slot_id: slotId });
    if (error || !id) throw new UseCaseError(error?.message ?? "No fue posible reservar la cita", 409);
    return this.getAppointment(String(id), accessToken);
  }

  async cancel(id: string, accessToken: string): Promise<Appointment> {
    const { error } = await createServerSupabaseClient(accessToken).rpc("cancel_appointment", { p_appointment_id: id });
    if (error) throw new UseCaseError(error.message, 409);
    return this.getAppointment(id, accessToken);
  }

  async close(id: string, status: "completed" | "no_show", accessToken: string): Promise<Appointment> {
    const { error } = await createServerSupabaseClient(accessToken).rpc("close_appointment", { p_appointment_id: id, p_status: status });
    if (error) throw new UseCaseError(error.message, 409);
    return this.getAppointment(id, accessToken);
  }

  async getAppointment(id: string, accessToken: string): Promise<Appointment> {
    const { data, error } = await createServerSupabaseClient(accessToken).from("appointments").select(appointmentSelect).eq("id", id).maybeSingle();
    if (error || !data) throw new UseCaseError(error?.message ?? "Cita no encontrada", 404);
    return mapAppointment(data as Row);
  }
}
