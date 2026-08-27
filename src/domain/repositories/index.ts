// See docs/CONSTITUCION.md section 3.1.

import type {
  Answer,
  AttendanceRecord,
  AttendanceSession,
  AttendanceStatus,
  Cohort,
  Form,
  FormAssignment,
  FormAssignmentTargetType,
  FormResponse,
  FormSkill,
  FormStatus,
  Invitation,
  IkigaiProfile,
  EmploymentProfile,
  ExperienceEntry,
  SkillItem,
  EducationEntry,
  ProfileItemOrigin,
  SkillCategory,
  AchievementEvidence,
  CvContent,
  CvQualityCheckResult,
  CvStatus,
  CvVersion,
  JobApplication,
  JobApplicationStatusEvent,
  JobKeyword,
  JobSource,
  JobTarget,
  RecruiterResearch,
  UserProfile,
  Question,
  QuestionOptionBranch,
  QuestionSkillWeight,
  User,
} from "../entities";
import type { AnswerValue, QuestionConfig, QuestionType } from "../value-objects";

export interface AuthSession {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export interface RegisterViaInvitationInput {
  token: string;
  email: string;
  password: string;
  fullName: string;
}

export interface AuthRepository {
  login(email: string, password: string): Promise<AuthSession>;
  logout(accessToken: string, refreshToken: string | null): Promise<void>;
  getCurrentUser(accessToken: string): Promise<User | null>;
  requestPasswordReset(email: string, redirectTo: string): Promise<void>;
  resetPassword(tokenHash: string, newPassword: string): Promise<AuthSession>;
  refreshSession(refreshToken: string): Promise<AuthSession>;
  registerViaInvitation(input: RegisterViaInvitationInput): Promise<AuthSession>;
  getInvitationByToken(token: string): Promise<Invitation | null>;
  generateInvitation(
    cohortId: string,
    createdBy: string,
    adminAccessToken: string,
    intendedRole?: "usuario" | "test"
  ): Promise<Invitation>;
  deactivateInvitation(invitationId: string, adminAccessToken: string): Promise<void>;
  listInvitationsByCohort(cohortId: string, adminAccessToken: string): Promise<Invitation[]>;
}

export interface UpdateIkigaiProfileInput {
  whatYouLove?: string;
  whatYouAreGoodAt?: string;
  whatWorldNeeds?: string;
  whatYouCanBePaidFor?: string;
  synthesis?: string | null;
}

export interface IkigaiRepository {
  getIkigaiProfile(accessToken: string): Promise<IkigaiProfile | null>;
  upsertIkigaiProfile(
    input: UpdateIkigaiProfileInput,
    accessToken: string
  ): Promise<IkigaiProfile>;
}

export interface UpdateEmploymentProfileInput {
  headline?: string;
  summary?: string;
}

export interface CreateExperienceEntryInput {
  organization: string;
  role: string;
  location?: string;
  startDate?: string;
  endDate?: string | null;
  isCurrent?: boolean;
  contextDescription?: string;
  order?: number;
  origin?: ProfileItemOrigin;
}

export type UpdateExperienceEntryInput = Partial<CreateExperienceEntryInput>;

export interface CreateSkillItemInput {
  name: string;
  category: SkillCategory;
  origin?: ProfileItemOrigin;
}

export type UpdateSkillItemInput = Partial<CreateSkillItemInput>;

export interface CreateEducationEntryInput {
  institution: string;
  degree: string;
  fieldOfStudy?: string;
  startDate?: string;
  endDate?: string | null;
  isCurrent?: boolean;
}

export type UpdateEducationEntryInput = Partial<CreateEducationEntryInput>;

export interface EmploymentProfileRepository {
  getEmploymentProfile(accessToken: string): Promise<EmploymentProfile | null>;
  updateEmploymentProfile(input: UpdateEmploymentProfileInput, accessToken: string): Promise<EmploymentProfile>;
  addExperienceEntry(input: CreateExperienceEntryInput, accessToken: string): Promise<ExperienceEntry>;
  updateExperienceEntry(id: string, input: UpdateExperienceEntryInput, accessToken: string): Promise<ExperienceEntry>;
  deleteExperienceEntry(id: string, accessToken: string): Promise<void>;
  addSkillItem(input: CreateSkillItemInput, accessToken: string): Promise<SkillItem>;
  updateSkillItem(id: string, input: UpdateSkillItemInput, accessToken: string): Promise<SkillItem>;
  deleteSkillItem(id: string, accessToken: string): Promise<void>;
  addEducationEntry(input: CreateEducationEntryInput, accessToken: string): Promise<EducationEntry>;
  updateEducationEntry(id: string, input: UpdateEducationEntryInput, accessToken: string): Promise<EducationEntry>;
  deleteEducationEntry(id: string, accessToken: string): Promise<void>;
}

export interface JobTargetRepository {
  listJobTargets(accessToken: string): Promise<JobTarget[]>;
  getJobTarget(id: string, accessToken: string): Promise<JobTarget | null>;
  createJobTarget(input: { sourceSite: JobSource; rawText: string; companyName: string | null; roleTitle: string | null }, accessToken: string): Promise<JobTarget>;
  saveKeywords(jobTargetId: string, keywords: Array<Omit<JobKeyword, "id" | "jobTargetId">>, accessToken: string): Promise<JobKeyword[]>;
}
export interface EvidenceRepository {
  listByExperience(experienceEntryId: string, accessToken: string): Promise<AchievementEvidence[]>;
  create(input: Omit<AchievementEvidence, "id" | "createdAt">, accessToken: string): Promise<AchievementEvidence>;
}
export interface CvRepository {
  list(accessToken: string): Promise<CvVersion[]>;
  get(id: string, accessToken: string): Promise<CvVersion | null>;
  create(input: { jobTargetId: string; title: string; content: CvContent }, accessToken: string): Promise<CvVersion>;
  updateContent(id: string, content: CvContent, accessToken: string): Promise<CvVersion>;
  // Cambia el título como parte de un cambio de contenido (aplica una nueva
  // propuesta de resumen) — por eso reinicia quality_check/status, igual que
  // updateContent. Para un renombrado puramente cosmético usa renameCv.
  updateTitle(id: string, title: string, accessToken: string): Promise<CvVersion>;
  // Renombra sin efectos secundarios — no toca quality_check ni status.
  renameCv(id: string, title: string, accessToken: string): Promise<CvVersion>;
  setQualityCheck(id: string, result: CvQualityCheckResult, accessToken: string): Promise<CvVersion>;
  setStatus(id: string, status: CvStatus, accessToken: string): Promise<CvVersion>;
}
export interface ApplicationRepository {
  list(accessToken: string): Promise<JobApplication[]>;
  get(id: string, accessToken: string): Promise<JobApplication | null>;
  create(input: Omit<JobApplication, "id" | "userId" | "statusUpdatedAt">, accessToken: string): Promise<JobApplication>;
  updateStatus(id: string, status: JobApplication["status"], accessToken: string): Promise<JobApplication>;
  updateType(id: string, type: JobApplication["applicationType"], accessToken: string): Promise<JobApplication>;
  listStatusEvents(accessToken: string): Promise<JobApplicationStatusEvent[]>;
  getResearch(id: string, accessToken: string): Promise<RecruiterResearch | null>;
  upsertResearch(input: RecruiterResearch, accessToken: string): Promise<RecruiterResearch>;
}

export interface UpsertUserProfileInput {
  phone?: string;
  location?: string;
  linkedinUrl?: string | null;
}

export interface UserProfileRepository {
  getUserProfile(accessToken: string): Promise<UserProfile | null>;
  upsertUserProfile(input: UpsertUserProfileInput, accessToken: string): Promise<UserProfile>;
  // Actualiza public.users.full_name directo — el RLS y el trigger de
  // endurecimiento de auth ya lo permiten (solo protegen role/cohort_id).
  updateOwnFullName(fullName: string, accessToken: string): Promise<void>;
}

export interface CreateCohortInput {
  name: string;
  description: string | null;
}

export interface CohortRepository {
  createCohort(input: CreateCohortInput, adminAccessToken: string): Promise<Cohort>;
  listCohorts(adminAccessToken: string): Promise<Cohort[]>;
  getCohortById(cohortId: string, adminAccessToken: string): Promise<Cohort | null>;
  listParticipantsByCohort(cohortId: string, adminAccessToken: string): Promise<User[]>;
}

export interface CreateFormInput {
  title: string;
  description: string | null;
  createdBy: string;
}

export interface UpdateFormDetailsInput {
  title?: string;
  description?: string | null;
  allowsPartialSave?: boolean;
  instructionsPopup?: string | null;
}

export interface CreateQuestionInput {
  formId: string;
  label: string;
  type: QuestionType;
  config: QuestionConfig;
  required: boolean;
  timeLimitSeconds: number | null;
}

export interface UpdateQuestionInput {
  label?: string;
  type?: QuestionType;
  config?: QuestionConfig;
  required?: boolean;
  timeLimitSeconds?: number | null;
}

export interface CreateFormSkillInput {
  formId: string;
  name: string;
  description: string | null;
  icon?: string;
  color?: string;
}

export interface UpdateFormSkillInput {
  name?: string;
  description?: string | null;
  icon?: string | null;
  color?: string | null;
}

export interface SetQuestionSkillWeightInput {
  skillId: string;
  weight: number;
}

export interface QuestionOptionBranchRuleInput {
  optionValue: string;
  targetQuestionId: string | null;
  endsForm: boolean;
}

export interface FormRepository {
  createForm(input: CreateFormInput, adminAccessToken: string): Promise<Form>;
  listForms(adminAccessToken: string): Promise<Form[]>;
  getFormById(formId: string, adminAccessToken: string): Promise<Form | null>;
  updateFormDetails(
    formId: string,
    input: UpdateFormDetailsInput,
    adminAccessToken: string
  ): Promise<Form>;
  setFormStatus(formId: string, status: FormStatus, adminAccessToken: string): Promise<Form>;
  setAcceptingResponses(
    formId: string,
    acceptingResponses: boolean,
    adminAccessToken: string
  ): Promise<Form>;

  listQuestionsByForm(formId: string, adminAccessToken: string): Promise<Question[]>;
  getQuestionById(
    formId: string,
    questionId: string,
    adminAccessToken: string
  ): Promise<Question | null>;
  addQuestion(input: CreateQuestionInput, adminAccessToken: string): Promise<Question>;
  updateQuestion(
    formId: string,
    questionId: string,
    input: UpdateQuestionInput,
    adminAccessToken: string
  ): Promise<Question>;
  deleteQuestion(formId: string, questionId: string, adminAccessToken: string): Promise<void>;
  reorderQuestions(
    formId: string,
    orderedQuestionIds: string[],
    adminAccessToken: string
  ): Promise<Question[]>;

  countResponsesByForm(formId: string, adminAccessToken: string): Promise<number>;

  listFormSkills(formId: string, adminAccessToken: string): Promise<FormSkill[]>;
  createFormSkill(input: CreateFormSkillInput, adminAccessToken: string): Promise<FormSkill>;
  updateFormSkill(
    formId: string,
    skillId: string,
    input: UpdateFormSkillInput,
    adminAccessToken: string
  ): Promise<FormSkill>;
  deleteFormSkill(formId: string, skillId: string, adminAccessToken: string): Promise<void>;

  listQuestionSkillWeightsByForm(
    formId: string,
    adminAccessToken: string
  ): Promise<QuestionSkillWeight[]>;
  setQuestionSkillWeight(
    formId: string,
    questionId: string,
    input: SetQuestionSkillWeightInput,
    adminAccessToken: string
  ): Promise<QuestionSkillWeight>;
  clearQuestionSkillWeight(
    formId: string,
    questionId: string,
    adminAccessToken: string
  ): Promise<void>;

  listFormAssignments(formId: string, adminAccessToken: string): Promise<FormAssignment[]>;
  setFormAssignments(
    formId: string,
    targets: { targetType: FormAssignmentTargetType; targetId: string }[],
    adminAccessToken: string
  ): Promise<FormAssignment[]>;
  duplicateForm(
    formId: string,
    input: { createdBy: string },
    adminAccessToken: string
  ): Promise<Form>;

  listQuestionOptionBranchesByForm(
    formId: string,
    adminAccessToken: string
  ): Promise<QuestionOptionBranch[]>;
  setQuestionOptionBranches(
    formId: string,
    questionId: string,
    branches: QuestionOptionBranchRuleInput[],
    adminAccessToken: string
  ): Promise<QuestionOptionBranch[]>;
}

export interface ResponseRepository {
  listVisibleForms(accessToken: string): Promise<Form[]>;
  listResponsesForParticipant(accessToken: string): Promise<FormResponse[]>;
  getResponse(formId: string, participantId: string, accessToken: string): Promise<FormResponse | null>;
  resumeParticipantResponse(formId: string, accessToken: string): Promise<FormResponse>;
  listAnswersByResponse(responseId: string, accessToken: string): Promise<Answer[]>;
  submitParticipantAnswerAndAdvance(
    responseId: string,
    questionId: string,
    value: AnswerValue | null,
    autoSubmittedByTimeout: boolean,
    accessToken: string
  ): Promise<string | null>;
}

export interface StatsRepository {
  listResponsesByForm(formId: string, adminAccessToken: string): Promise<FormResponse[]>;
  listAnswersByForm(formId: string, adminAccessToken: string): Promise<Answer[]>;
  listResponsesForParticipant(
    participantId: string,
    adminAccessToken: string
  ): Promise<FormResponse[]>;
  getUserById(userId: string, adminAccessToken: string): Promise<User | null>;
}

export interface JustifyAttendanceInput {
  sessionId: string;
  participantId: string;
  description: string;
  // null => no se está reemplazando el archivo existente (si lo hay).
  file: File | null;
}

export interface AttendanceRepository {
  listSessionsByCohort(cohortId: string, adminAccessToken: string): Promise<AttendanceSession[]>;
  // Crea (idempotente) las sesiones de los últimos N días hábiles que aún no existan.
  ensureSession(
    cohortId: string,
    sessionDate: string,
    createdBy: string,
    adminAccessToken: string
  ): Promise<void>;

  listRecordsByCohort(cohortId: string, adminAccessToken: string): Promise<AttendanceRecord[]>;
  getRecord(
    sessionId: string,
    participantId: string,
    adminAccessToken: string
  ): Promise<AttendanceRecord | null>;
  setStatus(
    sessionId: string,
    participantId: string,
    status: Exclude<AttendanceStatus, "justificado">,
    recordedBy: string,
    adminAccessToken: string
  ): Promise<AttendanceRecord>;
  clearStatus(sessionId: string, participantId: string, adminAccessToken: string): Promise<void>;

  justify(input: JustifyAttendanceInput, adminAccessToken: string): Promise<AttendanceRecord>;
  removeJustification(
    sessionId: string,
    participantId: string,
    adminAccessToken: string
  ): Promise<AttendanceRecord>;
  getJustificationFileUrl(
    sessionId: string,
    participantId: string,
    adminAccessToken: string
  ): Promise<{ url: string; fileType: string } | null>;
}
