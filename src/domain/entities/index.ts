import type { AnswerValue, QuestionConfig, QuestionType } from "../value-objects";

export type UserRole = "super_admin" | "admin" | "psicologa" | "usuario" | "test";

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  cohortId: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface Invitation {
  id: string;
  token: string;
  cohortId: string;
  createdBy: string;
  isActive: boolean;
  createdAt: string;
  intendedRole: "usuario" | "test";
}

export interface Cohort {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
}

export type FormStatus = "draft" | "published" | "closed" | "archived";

export interface Form {
  id: string;
  title: string;
  description: string | null;
  status: FormStatus;
  acceptingResponses: boolean;
  allowsPartialSave: boolean;
  instructionsPopup: string | null;
  deadlineAt: string | null; // reservado, sin lógica activa aún
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface Question {
  id: string;
  formId: string;
  order: number;
  label: string;
  type: QuestionType;
  config: QuestionConfig;
  required: boolean;
  timeLimitSeconds: number | null;
}

export interface FormSkill {
  id: string;
  formId: string;
  name: string;
  description: string | null;
  icon?: string;
  color?: string;
}

export interface QuestionSkillWeight {
  id: string;
  questionId: string;
  skillId: string;
  weight: number; // entero 1-5, ver validateQuestionSkillWeight
}

export type FormAssignmentTargetType = "user" | "cohort";

export interface FormAssignment {
  id: string;
  formId: string;
  targetType: FormAssignmentTargetType;
  targetId: string;
}

export type FormResponseStatus = "in_progress" | "completed";

export interface FormResponse {
  id: string;
  formId: string;
  participantId: string;
  status: FormResponseStatus;
  currentQuestionId: string | null;
  submittedAt: string | null;
}

// Salto condicional para una opción de una pregunta single_choice. Exactamente
// uno de targetQuestionId/endsForm está definido (XOR), validado en el caso de
// uso y también con un CHECK + trigger en Postgres (supabase/sql).
export interface QuestionOptionBranch {
  id: string;
  questionId: string;
  optionValue: string;
  targetQuestionId: string | null;
  endsForm: boolean;
}

export interface Answer {
  id: string;
  responseId: string;
  questionId: string;
  value: AnswerValue | null; // null only when autoSubmittedByTimeout and nothing was selected
  autoSubmittedByTimeout: boolean;
}

export type AttendanceStatus = "asistio" | "retardo" | "falta" | "justificado";

export interface AttendanceSession {
  id: string;
  cohortId: string;
  sessionDate: string; // "YYYY-MM-DD"
  createdBy: string;
  createdAt: string;
}

export interface AttendanceJustification {
  description: string;
  filePath: string | null;
  fileType: string | null;
}

export interface AttendanceRecord {
  id: string;
  sessionId: string;
  participantId: string;
  status: AttendanceStatus;
  recordedBy: string;
  recordedAt: string;
  // Solo presente cuando status === "justificado".
  justification: AttendanceJustification | null;
}

export type AppointmentModality = "remote" | "in_person";
export type AppointmentType = "mentoria" | "atencion_psicologica" | "orientacion_laboral";
export type AppointmentStatus =
  | "reserved"
  | "completed"
  | "cancelled_by_participant"
  | "cancelled_by_admin"
  | "no_show";

export interface AppointmentTag {
  id: string;
  name: string;
}

export interface AppointmentSlot {
  id: string;
  mentorId: string;
  mentorName: string;
  appointmentType: AppointmentType;
  appointmentTypeLabel: string;
  startsAt: string;
  endsAt: string;
  durationMinutes: 30 | 60 | 90 | 120;
  modality: AppointmentModality;
  locationText: string | null;
  cohortIds: string[];
  status: "available" | "booked" | "expired" | "withdrawn";
}

export interface Appointment {
  id: string;
  slotId: string;
  participantId: string;
  participantName: string;
  participantCohortName: string;
  mentorId: string;
  mentorName: string;
  appointmentType: AppointmentType;
  appointmentTypeLabel: string;
  startsAt: string;
  endsAt: string;
  durationMinutes: 30 | 60 | 90 | 120;
  modality: AppointmentModality;
  locationText: string | null;
  remoteMeetingUrl: string | null;
  status: AppointmentStatus;
  tags: AppointmentTag[];
  notes: string | null;
  createdAt: string;
}

export interface AppointmentFormTemplate {
  id: string;
  title: string;
  description: string | null;
  questionCount: number;
  createdBy: string;
  updatedAt: string;
}

export interface AppointmentFollowUp {
  appointmentId: string;
  notes: string;
  goals: string[];
  commitments: { description: string; completed: boolean }[];
  forms: { templateId: string; title: string; status: "in_progress" | "completed" }[];
}

export interface AppointmentParticipantDetail {
  id: string;
  fullName: string;
  email: string;
  cohortName: string;
  joinedAt: string;
  attendanceSummary: { attended: number; late: number; absent: number };
  appointmentHistory: { id: string; startsAt: string; type: string; status: AppointmentStatus; mentorName: string }[];
}
