import type { AnswerValue, QuestionConfig, QuestionType } from "../value-objects";

export type UserRole = "admin" | "participant";

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  cohortId: string | null;
  createdAt: string;
}

export interface Invitation {
  id: string;
  token: string;
  cohortId: string;
  createdBy: string;
  isActive: boolean;
  createdAt: string;
}

export interface Cohort {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
}

export type FormStatus = "draft" | "published" | "closed";

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
