import type {
  Appointment,
  AppointmentFormTemplate,
  AppointmentFollowUp,
  AppointmentParticipantDetail,
  AppointmentModality,
  AppointmentSlot,
  AppointmentStatus,
  AppointmentType,
} from "@/domain/entities";

const DEMO_PARTICIPANT_ID = "mock-participant-1";
const DEMO_MENTOR_ID = "mock-mentor-1";
const DEMO_COHORT_ID = "mock-cohort-1";

interface MockState {
  slots: AppointmentSlot[];
  appointments: Appointment[];
  templates: AppointmentFormTemplate[];
  followUps: Record<string, AppointmentFollowUp>;
}

const globalStore = globalThis as typeof globalThis & { __restartAppointmentMock?: MockState };

function isoAt(daysFromToday: number, hour: number, minute = 0): string {
  const date = new Date();
  date.setDate(date.getDate() + daysFromToday);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
}

const TYPE_LABELS: Record<AppointmentType, string> = {
  mentoria: "Mentoría",
  atencion_psicologica: "Atención psicológica",
  orientacion_laboral: "Orientación laboral",
};

function createSeed(): MockState {
  const slots: AppointmentSlot[] = [
    { id: "slot-1", mentorId: DEMO_MENTOR_ID, mentorName: "Ana Martínez", appointmentType: "mentoria", appointmentTypeLabel: TYPE_LABELS.mentoria, startsAt: isoAt(1, 10), endsAt: isoAt(1, 11), durationMinutes: 60, modality: "remote", locationText: null, cohortIds: [DEMO_COHORT_ID], status: "available" },
    { id: "slot-2", mentorId: DEMO_MENTOR_ID, mentorName: "Ana Martínez", appointmentType: "orientacion_laboral", appointmentTypeLabel: TYPE_LABELS.orientacion_laboral, startsAt: isoAt(2, 12), endsAt: isoAt(2, 12, 30), durationMinutes: 30, modality: "in_person", locationText: "Sede Roma · Sala 3", cohortIds: [DEMO_COHORT_ID], status: "available" },
    { id: "slot-3", mentorId: "mock-mentor-2", mentorName: "Luis Herrera", appointmentType: "mentoria", appointmentTypeLabel: TYPE_LABELS.mentoria, startsAt: isoAt(3, 16), endsAt: isoAt(3, 17, 30), durationMinutes: 90, modality: "remote", locationText: null, cohortIds: [DEMO_COHORT_ID], status: "available" },
    { id: "slot-4", mentorId: DEMO_MENTOR_ID, mentorName: "Ana Martínez", appointmentType: "mentoria", appointmentTypeLabel: TYPE_LABELS.mentoria, startsAt: isoAt(5, 9), endsAt: isoAt(5, 10), durationMinutes: 60, modality: "in_person", locationText: "Sede Centro · Cubículo 2", cohortIds: [DEMO_COHORT_ID], status: "available" },
  ];
  const templates: AppointmentFormTemplate[] = [
    { id: "template-1", title: "Seguimiento de mentoría", description: "Preguntas para revisar avances y próximos pasos.", questionCount: 6, createdBy: "Ana Martínez", updatedAt: new Date().toISOString() },
    { id: "template-2", title: "Cierre de sesión", description: "Resumen interno y acuerdos de cierre.", questionCount: 4, createdBy: "Luis Herrera", updatedAt: new Date().toISOString() },
  ];
  return { slots, appointments: [], templates, followUps: {} };
}

function state(): MockState {
  globalStore.__restartAppointmentMock ??= createSeed();
  return globalStore.__restartAppointmentMock;
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function makeAppointment(slot: AppointmentSlot, participantId = DEMO_PARTICIPANT_ID): Appointment {
  return {
    id: `appointment-${Date.now()}`,
    slotId: slot.id,
    participantId,
    participantName: "Sofía Ramírez",
    participantCohortName: "Forge · Cohorte Primavera",
    mentorId: slot.mentorId,
    mentorName: slot.mentorName,
    appointmentType: slot.appointmentType,
    appointmentTypeLabel: slot.appointmentTypeLabel,
    startsAt: slot.startsAt,
    endsAt: slot.endsAt,
    durationMinutes: slot.durationMinutes,
    modality: slot.modality,
    locationText: slot.locationText,
    remoteMeetingUrl: slot.modality === "remote" ? "https://meet.google.com/demo-restart" : null,
    status: "reserved",
    tags: [],
    notes: null,
    createdAt: new Date().toISOString(),
  };
}

export function getParticipantCalendar(): { appointments: Appointment[]; slots: AppointmentSlot[]; demoMode: true } {
  const store = state();
  return { appointments: clone(store.appointments.filter((item) => item.participantId === DEMO_PARTICIPANT_ID)), slots: clone(store.slots.filter((item) => item.status === "available" && item.cohortIds.includes(DEMO_COHORT_ID))), demoMode: true };
}

export function getAdminCalendar(): { appointments: Appointment[]; slots: AppointmentSlot[]; demoMode: true } {
  const store = state();
  return { appointments: clone(store.appointments), slots: clone(store.slots), demoMode: true };
}

export function reserve(slotId: string): Appointment {
  const store = state();
  const slot = store.slots.find((item) => item.id === slotId);
  if (!slot || slot.status !== "available") throw new Error("Este horario ya no está disponible.");
  if (store.appointments.some((item) => item.participantId === DEMO_PARTICIPANT_ID && item.status === "reserved" && new Date(item.endsAt) > new Date())) {
    throw new Error("Ya tienes una cita futura. Cancélala antes de reservar otra.");
  }
  const appointment = makeAppointment(slot);
  slot.status = "booked";
  store.appointments.push(appointment);
  return clone(appointment);
}

export function changeStatus(id: string, status: AppointmentStatus): Appointment {
  const store = state();
  const appointment = store.appointments.find((item) => item.id === id);
  if (!appointment) throw new Error("Cita no encontrada.");
  appointment.status = status;
  if (status === "cancelled_by_participant") {
    const slot = store.slots.find((item) => item.id === appointment.slotId);
    if (slot && new Date(appointment.startsAt).getTime() - Date.now() >= 24 * 60 * 60 * 1000) slot.status = "available";
  }
  return clone(appointment);
}

export function updateAppointment(id: string, input: { notes?: string | null; locationText?: string | null; tags?: string[] }): Appointment {
  const appointment = state().appointments.find((item) => item.id === id);
  if (!appointment) throw new Error("Cita no encontrada.");
  if (input.notes !== undefined) appointment.notes = input.notes;
  if (input.locationText !== undefined && appointment.modality === "in_person") appointment.locationText = input.locationText;
  if (input.tags) appointment.tags = input.tags.map((name, index) => ({ id: `tag-${index}-${name}`, name: name.trim() })).filter((tag) => tag.name.length > 0);
  return clone(appointment);
}

export function publishSlot(input: { startsAt: string; durationMinutes: 30 | 60 | 90 | 120; modality: AppointmentModality; locationText?: string | null; appointmentType: string }): AppointmentSlot {
  const store = state();
  const start = new Date(input.startsAt);
  const end = new Date(start.getTime() + input.durationMinutes * 60_000);
  const overlaps = store.slots.some((slot) => slot.mentorId === DEMO_MENTOR_ID && slot.status !== "withdrawn" && new Date(slot.startsAt) < end && new Date(slot.endsAt) > start);
  if (overlaps) throw new Error("Ese espacio se traslapa con otra disponibilidad.");
  const type = input.appointmentType as AppointmentType;
  const slot: AppointmentSlot = { id: `slot-${Date.now()}`, mentorId: DEMO_MENTOR_ID, mentorName: "Ana Martínez", appointmentType: type, appointmentTypeLabel: TYPE_LABELS[type] ?? input.appointmentType, startsAt: start.toISOString(), endsAt: end.toISOString(), durationMinutes: input.durationMinutes, modality: input.modality, locationText: input.modality === "in_person" ? input.locationText ?? null : null, cohortIds: [DEMO_COHORT_ID], status: "available" };
  store.slots.push(slot);
  return clone(slot);
}

export function publishAvailabilityPeriod(input: { startDate: string; endDate: string; weekdays: number[]; dailyStartTime: string; dailyEndTime: string; durationMinutes: 30 | 60 | 90 | 120; modality: AppointmentModality; locationText?: string | null; appointmentType: string }): AppointmentSlot[] {
  const created: AppointmentSlot[] = [];
  const [startHour, startMinute] = input.dailyStartTime.split(":").map(Number);
  const [endHour, endMinute] = input.dailyEndTime.split(":").map(Number);
  for (const date = new Date(`${input.startDate}T00:00:00`); date <= new Date(`${input.endDate}T00:00:00`); date.setDate(date.getDate() + 1)) {
    if (!input.weekdays.includes(date.getDay())) continue;
    for (let minutes = startHour * 60 + startMinute; minutes + input.durationMinutes <= endHour * 60 + endMinute; minutes += input.durationMinutes) {
      const start = new Date(date); start.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
      try { created.push(publishSlot({ startsAt: start.toISOString(), durationMinutes: input.durationMinutes, modality: input.modality, locationText: input.locationText, appointmentType: input.appointmentType })); } catch { /* skip overlaps in a batch and keep the valid slots */ }
    }
  }
  if (created.length === 0) throw new Error("No se pudieron abrir espacios: revisa el periodo o los traslapes.");
  return created;
}

export function listTemplates(): AppointmentFormTemplate[] { return clone(state().templates); }
export function createTemplate(title: string, description?: string): AppointmentFormTemplate {
  const template: AppointmentFormTemplate = { id: `template-${Date.now()}`, title, description: description || null, questionCount: 0, createdBy: "Ana Martínez", updatedAt: new Date().toISOString() };
  state().templates.unshift(template);
  return clone(template);
}

export function getFollowUp(id: string): AppointmentFollowUp {
  const store = state();
  store.followUps[id] ??= { appointmentId: id, notes: "", goals: [], commitments: [], forms: [] };
  return clone(store.followUps[id]);
}

export function saveFollowUp(id: string, input: Omit<AppointmentFollowUp, "appointmentId">): AppointmentFollowUp {
  const followUp: AppointmentFollowUp = { appointmentId: id, notes: input.notes, goals: input.goals, commitments: input.commitments, forms: input.forms };
  state().followUps[id] = followUp;
  return clone(followUp);
}

export function getParticipantDetail(appointmentId: string): AppointmentParticipantDetail {
  const appointment = state().appointments.find((item) => item.id === appointmentId);
  if (!appointment) throw new Error("Cita no encontrada.");
  return clone({
    id: appointment.participantId,
    fullName: appointment.participantName,
    email: "sofia.ramirez@demo.dekids.mx",
    cohortName: appointment.participantCohortName,
    joinedAt: "2025-09-01T12:00:00.000Z",
    attendanceSummary: { attended: 8, late: 1, absent: 0 },
    appointmentHistory: state().appointments.filter((item) => item.participantId === appointment.participantId).map((item) => ({ id: item.id, startsAt: item.startsAt, type: item.appointmentTypeLabel, status: item.status, mentorName: item.mentorName })),
  });
}

export const mockIds = { participantId: DEMO_PARTICIPANT_ID, mentorId: DEMO_MENTOR_ID };
