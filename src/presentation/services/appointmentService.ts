import type {
  Appointment,
  AppointmentFormTemplate,
  AppointmentFollowUp,
  AppointmentParticipantDetail,
  AppointmentSlot,
} from "@/domain/entities";
import { axiosClient } from "./axiosClient";

export interface AppointmentCalendarResult {
  appointments: Appointment[];
  slots: AppointmentSlot[];
  demoMode: boolean;
}

export async function getParticipantCalendar(): Promise<AppointmentCalendarResult> {
  const { data } = await axiosClient.get<AppointmentCalendarResult>("/appointments", {
    params: { view: "participant" },
  });
  return data;
}

export async function getAdminCalendar(input?: {
  start?: string;
  end?: string;
}): Promise<AppointmentCalendarResult> {
  const { data } = await axiosClient.get<AppointmentCalendarResult>("/appointments", {
    params: { view: "admin", ...input },
  });
  return data;
}

export async function reserveAppointment(slotId: string): Promise<Appointment> {
  const { data } = await axiosClient.post<Appointment>("/appointments", { slotId });
  return data;
}

export async function cancelAppointment(id: string): Promise<Appointment> {
  const { data } = await axiosClient.patch<Appointment>(
    `/appointments/${encodeURIComponent(id)}`,
    { status: "cancelled_by_participant" }
  );
  return data;
}

export async function setAppointmentStatus(
  id: string,
  status: "completed" | "no_show" | "cancelled_by_admin"
): Promise<Appointment> {
  const { data } = await axiosClient.patch<Appointment>(
    `/appointments/${encodeURIComponent(id)}`,
    { status }
  );
  return data;
}

export async function updateAppointment(
  id: string,
  input: { notes?: string | null; locationText?: string | null; tags?: string[] }
): Promise<Appointment> {
  const { data } = await axiosClient.patch<Appointment>(
    `/appointments/${encodeURIComponent(id)}`,
    input
  );
  return data;
}

export async function publishSlot(input: {
  startsAt: string;
  durationMinutes: 30 | 60 | 90 | 120;
  modality: "remote" | "in_person";
  locationText?: string | null;
  appointmentType: string;
  cohortIds: string[];
}): Promise<AppointmentSlot> {
  const { data } = await axiosClient.post<AppointmentSlot>("/appointment-slots", input);
  return data;
}

export async function publishAvailabilityPeriod(input: {
  startDate: string;
  endDate: string;
  weekdays: number[];
  dailyStartTime: string;
  dailyEndTime: string;
  durationMinutes: 30 | 60 | 90 | 120;
  modality: "remote" | "in_person";
  locationText?: string | null;
  appointmentType: string;
  cohortIds: string[];
}): Promise<AppointmentSlot[]> {
  const [startHour, startMinute] = input.dailyStartTime.split(":").map(Number);
  const [endHour, endMinute] = input.dailyEndTime.split(":").map(Number);
  const slots: Promise<AppointmentSlot>[] = [];
  for (const day = new Date(`${input.startDate}T00:00:00`); day <= new Date(`${input.endDate}T00:00:00`); day.setDate(day.getDate() + 1)) {
    if (!input.weekdays.includes(day.getDay())) continue;
    for (let minutes = startHour * 60 + startMinute; minutes + input.durationMinutes <= endHour * 60 + endMinute; minutes += input.durationMinutes) {
      const startsAt = new Date(day); startsAt.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
      slots.push(publishSlot({ startsAt: startsAt.toISOString(), durationMinutes: input.durationMinutes, modality: input.modality, locationText: input.locationText, appointmentType: input.appointmentType, cohortIds: input.cohortIds }));
    }
  }
  const results = await Promise.allSettled(slots);
  const created = results.filter((result): result is PromiseFulfilledResult<AppointmentSlot> => result.status === "fulfilled").map((result) => result.value);
  if (created.length === 0) throw new Error("No se pudieron abrir espacios: revisa el periodo, cohortes o traslapes.");
  return created;
}

export async function listAppointmentFormTemplates(): Promise<AppointmentFormTemplate[]> {
  const { data } = await axiosClient.get<AppointmentFormTemplate[]>("/appointment-form-templates");
  return data;
}

export async function createAppointmentFormTemplate(input: {
  title: string;
  description?: string;
  isPsychological?: boolean;
}): Promise<AppointmentFormTemplate> {
  const { data } = await axiosClient.post<AppointmentFormTemplate>(
    "/appointment-form-templates",
    input
  );
  return data;
}

export async function getAppointmentFollowUp(id: string): Promise<AppointmentFollowUp> {
  const { data } = await axiosClient.get<AppointmentFollowUp>(
    `/appointments/${encodeURIComponent(id)}/follow-up`
  );
  return data;
}

export async function saveAppointmentFollowUp(
  id: string,
  input: Omit<AppointmentFollowUp, "appointmentId">
): Promise<AppointmentFollowUp> {
  const { data } = await axiosClient.patch<AppointmentFollowUp>(
    `/appointments/${encodeURIComponent(id)}/follow-up`,
    input
  );
  return data;
}

export async function getAppointmentParticipant(id: string): Promise<AppointmentParticipantDetail> {
  const { data } = await axiosClient.get<AppointmentParticipantDetail>(
    `/appointments/${encodeURIComponent(id)}/participant`
  );
  return data;
}
