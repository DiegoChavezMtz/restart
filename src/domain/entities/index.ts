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

// Perfil de autoconocimiento del módulo de empleabilidad. Es una entidad
// independiente de Forms: permanece editable durante toda la experiencia.
export interface IkigaiProfile {
  id: string;
  userId: string;
  whatYouLove: string;
  whatYouAreGoodAt: string;
  whatWorldNeeds: string;
  whatYouCanBePaidFor: string;
  synthesis: string | null;
  updatedAt: string;
}

export type ProfileItemOrigin =
  | { type: "ikigai"; refId: string | null }
  | { type: "exploration"; refId: string | null }
  | { type: "manual"; refId: null };

export interface EmploymentProfile {
  id: string;
  userId: string;
  headline: string;
  summary: string;
  updatedAt: string;
  experience: ExperienceEntry[];
  skills: SkillItem[];
  education: EducationEntry[];
}

export interface ExperienceEntry {
  id: string;
  profileId: string;
  organization: string;
  role: string;
  location: string;
  startDate: string;
  endDate: string | null;
  isCurrent: boolean;
  contextDescription: string;
  order: number;
  origin: ProfileItemOrigin;
}

export type SkillCategory = "hard" | "soft" | "tool" | "language";

export interface SkillItem {
  id: string;
  profileId: string;
  name: string;
  category: SkillCategory;
  origin: ProfileItemOrigin;
}

export interface EducationEntry {
  id: string;
  profileId: string;
  institution: string;
  degree: string;
  fieldOfStudy: string;
  startDate: string;
  endDate: string | null;
  isCurrent: boolean;
}

export type JobSource = "linkedin" | "indeed" | "occ" | "otro";
export type KeywordRelevance = "high" | "medium" | "low";

export interface JobTarget {
  id: string;
  userId: string;
  sourceSite: JobSource;
  rawText: string;
  companyName: string | null;
  roleTitle: string | null;
  createdAt: string;
  keywords: JobKeyword[];
}

export interface JobKeyword {
  id: string;
  jobTargetId: string;
  keyword: string;
  relevance: KeywordRelevance;
  matchedInProfile: boolean;
}

export interface AchievementEvidence {
  id: string;
  experienceEntryId: string;
  claim: string;
  metricValue: string | null;
  metricConfirmedByUser: boolean;
  createdAt: string;
}

export type CvStatus = "draft" | "quality_review" | "approved" | "sent";
export interface CvBullet { id: string; text: string; evidenceId: string | null; approved: boolean; }
export interface CvContent {
  contact: { fullName: string; email: string; phone: string; location: string; linkedinUrl: string | null };
  summary: string;
  experience: Array<{ experienceEntryId: string; organization: string; role: string; location: string; startDate: string; endDate: string | null; bullets: CvBullet[] }>;
  education: Array<{ institution: string; degree: string; fieldOfStudy: string; startDate: string; endDate: string | null }>;
  skills: string[];
}
export interface CvQualityCheckResult {
  spellingOk: boolean;
  spellingIssues: string[];
  lengthOk: boolean;
  noUnconfirmedNumbers: boolean;
  coherenceNotes: string[];
  checkedAt: string;
  layoutPageCount?: number;
}

// Datos de contacto — plataforma, no exclusivo de empleo. 1:1 con el usuario.
// Ver supabase/sql/046_user_profiles.sql y docs/MODULO_EMPLEO.md.
export interface UserProfile {
  id: string;
  userId: string;
  phone: string;
  location: string;
  linkedinUrl: string | null;
  updatedAt: string;
}
export interface CvVersion {
  id: string; userId: string; jobTargetId: string; title: string; status: CvStatus;
  content: CvContent; qualityCheck: CvQualityCheckResult | null; createdAt: string; updatedAt: string;
}

export type ApplicationStatus = "applied" | "response" | "interview" | "offer" | "rejected";
export type ApplicationType = "proactive" | "reactive";
export interface JobApplication {
  id: string; userId: string; jobTargetId: string; cvVersionId: string; source: JobSource;
  applicationType: ApplicationType; companyName: string; roleTitle: string; status: ApplicationStatus;
  appliedAt: string; statusUpdatedAt: string;
}
export interface JobApplicationStatusEvent {
  id: string;
  jobApplicationId: string;
  status: ApplicationStatus;
  occurredAt: string;
}
export interface RecruiterResearch {
  jobApplicationId: string; recruiterName: string; recruiterRole: string; companyTenureNote: string;
  recentCompanyFact: string; commonGroundNote: string; outreachMessage: string; completedAt: string | null;
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
