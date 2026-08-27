# Módulo de Empleabilidad — Fuente de verdad

Este documento es la referencia completa para construir el módulo de empleabilidad de Restart. Reúne todas las decisiones de diseño tomadas (dominio, migraciones, UI, motor de IA) y el estado actual de avance (UI mockeada ya construida). Cualquier trabajo futuro sobre este módulo debe partir de aquí y actualizar este archivo si algo cambia.

> Convenciones heredadas del resto del proyecto — ver `docs/FOUNDATION.md`. Este módulo sigue la misma Clean Architecture (`domain` → `application` → `infrastructure` → `presentation`), el mismo sistema de theming, y el mismo patrón de migraciones SQL idempotentes en `supabase/sql/`.

---

## 0. Índice

1. Resumen funcional y alcance
2. Encaje en la arquitectura existente
3. Dominio (entidades, repositorios, casos de uso)
4. Migraciones SQL
5. Vistas UI
6. Motor de IA (prompts por función)
7. Estado actual de avance (qué ya existe como mockup)
8. Decisiones tomadas durante el diseño
9. Preguntas abiertas / pendientes
10. Siguientes pasos sugeridos
11. Plan de ejecución: CV guiado por IA y control humano

---

## 1. Resumen funcional y alcance

Módulo exclusivo para roles `usuario`/`test` (autoservicio), con estos pilares:

1. **Ikigai** — ejercicio de autoconocimiento (4 preguntas + síntesis), siempre visible y editable. No es un Form del sistema genérico de formularios.
2. **Descúbrete** — entrevista conversacional continua con IA que va conociendo al usuario y genera "insights" que el usuario aprueba/descarta antes de que entren a su perfil.
3. **Perfil de habilidades y experiencia** — fuente única de verdad: ningún otro módulo (CV, etc.) puede inventar experiencia que no exista aquí. Incluye experiencia laboral, habilidades y educación.
4. **Objetivo + Keywords** — el usuario pega el texto de una vacante real; la IA extrae keywords relevantes para ATS, sin inventar ni sugerir vacantes.
5. **Recolección de evidencia** — antes de redactar cualquier logro con cifra, la IA pregunta el dato concreto. Sin dato confirmado, el bullet se redacta en términos cualitativos — nunca con cifra inventada.
6. **Generador de CV (modelo Harvard)** — cruza perfil + keywords + evidencia confirmada. Una columna, sin tablas, sin iconos, sin foto. Cada bullet es editable/aprobable. Cada versión queda ligada a la vacante para la que se generó.
7. **Biblioteca de CVs** — historial de versiones por vacante, reutilizables como punto de partida.
8. **Control de calidad** — paso obligatorio antes de "enviado": ortografía, gramática, coherencia, extensión (una página), y bloqueo de cualquier cifra no confirmada.
9. **Aplicación (bifurcación por fuente)**:
   - LinkedIn → checklist de investigación del reclutador → IA redacta mensaje de contacto → se registra como **proactiva**.
   - Indeed/OCC → se registra como **reactiva**, solo tracking de estatus.
10. **Registro y seguimiento de postulaciones** — estatus: Aplicado → Respuesta → Entrevista → Oferta / Rechazado (Rechazado puede ocurrir desde cualquier punto). Alertas de 5-7+ días sin cambio.
11. **Métrica de conversión** — proactiva vs. reactiva, por ahora solo para el propio usuario (ver §9, visibilidad admin queda pendiente).

**Fuera de alcance (v1):** preparación de entrevistas, verificación CV↔LinkedIn, búsqueda automática de vacantes/reclutadores, aplicación automática, dashboard agregado para admin/facilitador (pendiente de decisión, ver §9).

**Pospuesto a v2:** “Descúbrete” (entrevista conversacional e insights). Sus entidades y mockups pueden permanecer como referencia de diseño, pero no se activa ninguna llamada de IA ni ruta de backend para esa sección en v1.

---

## 2. Encaje en la arquitectura existente

- Vive como área nueva para `usuario`/`test`, paralela a `/respond`, bajo `src/app/employment/`, reutilizando `ParticipantLayout` + `RequireAuth` (mismo patrón que `src/app/respond/layout.tsx`).
- El **ikigai no usa el sistema de Forms genérico** (`forms`/`questions`/`form_responses`/`answers`). Se decidió así porque una `FormResponse` se bloquea tras enviarse (navegación lineal sin retroceso — regla 4 de `FOUNDATION.md`), y el ikigai necesita lo opuesto: persistente, siempre visible, editable en cualquier momento. Por eso es una entidad nativa de empleabilidad, no un Form.
- El dashboard de conversión para facilitador (si se construye) viviría en `/admin/employability`, separado de la experiencia del usuario — **pendiente de decisión** (§9).
- **Regla de negocio nueva** (a sumar a las 14 de `FOUNDATION.md` cuando se implemente el backend real): *"Ningún bullet de CV puede contener una cifra si no hay `AchievementEvidence` con `metricConfirmedByUser = true` ligada a él."* Se valida en el caso de uso que guarda el bullet, nunca confiando en que el LLM lo respete por sí solo.
- Cero impacto en tablas existentes: todo el árbol de tablas de empleabilidad cuelga únicamente de una FK de solo lectura a `public.users(id)` (igual que `attendance_records.participant_id`). No hay `ALTER TABLE` sobre `users`, `forms`, `answers` ni ninguna tabla actual. Ver §4 para el detalle de verificación de nombres.

---

## 3. Dominio

### 3.1 Entidades nuevas (`domain/entities`)

```ts
// ---- Ikigai — 1:1 con el usuario, siempre editable, nunca se bloquea ----
export interface IkigaiProfile {
  id: string;
  userId: string;
  whatYouLove: string;           // lo que amas
  whatYouAreGoodAt: string;      // en lo que eres bueno
  whatWorldNeeds: string;        // lo que el mundo necesita
  whatYouCanBePaidFor: string;   // por lo que te pueden pagar
  synthesis: string | null;      // síntesis/vocación — puede sugerirla la IA, la aprueba el usuario
  updatedAt: string;
}

// ---- Perfil — fuente única de verdad de experiencia/habilidades ----
export type ProfileItemOrigin =
  | { type: "ikigai"; refId: string | null }
  | { type: "exploration"; refId: string | null }   // refId -> ExplorationInsight.id
  | { type: "manual"; refId: null };

export interface EmploymentProfile {
  id: string;
  userId: string;                 // 1:1
  headline: string;
  summary: string;
  updatedAt: string;
}

export interface ExperienceEntry {
  id: string;
  profileId: string;
  organization: string;
  role: string;
  location: string;
  startDate: string;              // "YYYY-MM"
  endDate: string | null;
  isCurrent: boolean;
  contextDescription: string;     // qué hacía, sin cifras — las cifras viven en AchievementEvidence
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

// ---- Evidencia de logros — el gate anti-cifras-inventadas ----
export interface AchievementEvidence {
  id: string;
  experienceEntryId: string;
  claim: string;                     // qué se quiere decir, en cualitativo
  metricValue: string | null;        // cantidad/frecuencia/resultado, texto libre
  metricConfirmedByUser: boolean;    // true solo cuando el usuario confirma el dato — el gate real
  createdAt: string;
}

// ---- Vacante y keywords ----
export type JobSource = "linkedin" | "indeed" | "occ" | "otro";

export interface JobTarget {
  id: string;
  userId: string;
  sourceSite: JobSource;
  rawText: string;                   // texto pegado de la vacante, tal cual
  companyName: string | null;
  roleTitle: string | null;
  createdAt: string;
}

export interface JobKeyword {
  id: string;
  jobTargetId: string;
  keyword: string;
  relevance: "high" | "medium" | "low";
  matchedInProfile: boolean;         // calculado al extraer, cruzando SkillItem/ExperienceEntry
}

// ---- CV — contenido como JSONB (mismo patrón que Answer.value / QuestionConfig) ----
export type CvStatus = "draft" | "quality_review" | "approved" | "sent";

export interface CvContent {
  contact: { fullName: string; email: string; phone: string; location: string; linkedinUrl: string | null };
  summary: string;
  experience: Array<{
    experienceEntryId: string;
    organization: string;
    role: string;
    location: string;
    startDate: string;
    endDate: string | null;
    bullets: Array<{ id: string; text: string; evidenceId: string | null; approved: boolean }>;
  }>;
  education: Array<{ institution: string; degree: string; fieldOfStudy: string; startDate: string; endDate: string | null }>;
  skills: string[];
}

export interface CvQualityCheckResult {
  spellingOk: boolean;
  spellingIssues: string[];   // detalle determinístico (ver domain/value-objects/textQualityChecks.ts)
  lengthOk: boolean;
  noUnconfirmedNumbers: boolean;
  coherenceNotes: string[];
  checkedAt: string;
}

export interface CvVersion {
  id: string;
  userId: string;
  jobTargetId: string;
  title: string;
  status: CvStatus;
  content: CvContent;
  qualityCheck: CvQualityCheckResult | null;
  createdAt: string;
  updatedAt: string;
}

// ---- Postulaciones ----
export type ApplicationStatus = "applied" | "response" | "interview" | "offer" | "rejected";
export type ApplicationType = "proactive" | "reactive";

export interface JobApplication {
  id: string;
  userId: string;
  jobTargetId: string;
  cvVersionId: string;
  source: JobSource;
  applicationType: ApplicationType;
  companyName: string;              // denormalizado desde jobTarget para reportes aunque el target cambie
  roleTitle: string;
  status: ApplicationStatus;
  appliedAt: string;
  statusUpdatedAt: string;
}

export interface JobApplicationStatusEvent {
  id: string;
  jobApplicationId: string;
  status: ApplicationStatus;
  occurredAt: string;
}

// Solo aplica si source = 'linkedin'
export interface RecruiterResearch {
  id: string;
  jobApplicationId: string;
  recruiterName: string;
  recruiterRole: string;
  companyTenureNote: string;
  recentCompanyFact: string;
  commonGroundNote: string;
  outreachMessage: string;
  completedAt: string | null;
}

// ---- Descúbrete — entrevista conversacional continua ----
export interface ExplorationSession {
  id: string;
  userId: string;
  status: "active" | "completed" | "paused";
  startedAt: string;
  lastInteractionAt: string;
}

export interface ExplorationMessage {
  id: string;
  sessionId: string;
  role: "assistant" | "user";
  content: string;
  createdAt: string;
}

export type InsightCategory = "value" | "interest" | "strength" | "work_preference" | "constraint" | "goal";
export type InsightStatus = "pending_review" | "accepted" | "dismissed";

export interface ExplorationInsight {
  id: string;
  sessionId: string;
  userId: string;
  category: InsightCategory;
  content: string;                  // el insight sintetizado, no la respuesta cruda
  sourceMessageId: string;
  status: InsightStatus;
  createdAt: string;
}
```

### 3.2 Repositorios nuevos (`domain/repositories`)

Mismo estilo que `FormRepository`/`AttendanceRepository`: cada método recibe el `accessToken` del propio usuario (no `adminAccessToken` — este módulo es 100% self-service, sin operaciones administrativas).

```ts
export interface IkigaiRepository {
  getIkigaiProfile(accessToken: string): Promise<IkigaiProfile | null>;
  upsertIkigaiProfile(input: Partial<Omit<IkigaiProfile, "id" | "userId">>, accessToken: string): Promise<IkigaiProfile>;
}

export interface EmploymentProfileRepository {
  getProfile(accessToken: string): Promise<EmploymentProfile | null>;
  updateProfile(input: { headline?: string; summary?: string }, accessToken: string): Promise<EmploymentProfile>;

  listExperienceEntries(accessToken: string): Promise<ExperienceEntry[]>;
  addExperienceEntry(input: Omit<ExperienceEntry, "id" | "profileId">, accessToken: string): Promise<ExperienceEntry>;
  updateExperienceEntry(id: string, input: Partial<ExperienceEntry>, accessToken: string): Promise<ExperienceEntry>;
  deleteExperienceEntry(id: string, accessToken: string): Promise<void>;

  listSkillItems(accessToken: string): Promise<SkillItem[]>;
  addSkillItem(input: Omit<SkillItem, "id" | "profileId">, accessToken: string): Promise<SkillItem>;
  deleteSkillItem(id: string, accessToken: string): Promise<void>;

  listEducationEntries(accessToken: string): Promise<EducationEntry[]>;
  addEducationEntry(input: Omit<EducationEntry, "id" | "profileId">, accessToken: string): Promise<EducationEntry>;
  updateEducationEntry(id: string, input: Partial<EducationEntry>, accessToken: string): Promise<EducationEntry>;
  deleteEducationEntry(id: string, accessToken: string): Promise<void>;

  listEvidenceByExperience(experienceEntryId: string, accessToken: string): Promise<AchievementEvidence[]>;
  addEvidence(input: Omit<AchievementEvidence, "id" | "createdAt">, accessToken: string): Promise<AchievementEvidence>;
}

export interface JobTargetRepository {
  listJobTargets(accessToken: string): Promise<JobTarget[]>;
  getJobTarget(id: string, accessToken: string): Promise<JobTarget | null>;
  createJobTarget(input: { sourceSite: JobSource; rawText: string }, accessToken: string): Promise<JobTarget>;
  saveKeywords(jobTargetId: string, keywords: Omit<JobKeyword, "id" | "jobTargetId">[], accessToken: string): Promise<JobKeyword[]>;
  listKeywords(jobTargetId: string, accessToken: string): Promise<JobKeyword[]>;
}

export interface CvRepository {
  listCvVersions(accessToken: string): Promise<CvVersion[]>;
  getCvVersion(id: string, accessToken: string): Promise<CvVersion | null>;
  createCvVersion(input: { jobTargetId: string; title: string; content: CvContent }, accessToken: string): Promise<CvVersion>;
  updateCvContent(id: string, content: CvContent, accessToken: string): Promise<CvVersion>;
  setQualityCheck(id: string, result: CvQualityCheckResult, accessToken: string): Promise<CvVersion>;
  setStatus(id: string, status: CvStatus, accessToken: string): Promise<CvVersion>;
}

export interface ApplicationRepository {
  listApplications(accessToken: string): Promise<JobApplication[]>;
  getApplication(id: string, accessToken: string): Promise<JobApplication | null>;
  createApplication(input: Omit<JobApplication, "id" | "userId" | "statusUpdatedAt">, accessToken: string): Promise<JobApplication>;
  // Update directo a job_applications.status — el trigger de la migración
  // 043 registra el evento en job_application_status_events (ver §4).
  updateApplicationStatus(id: string, status: ApplicationStatus, accessToken: string): Promise<JobApplication>;
  listStatusEvents(applicationId: string, accessToken: string): Promise<JobApplicationStatusEvent[]>;

  getRecruiterResearch(applicationId: string, accessToken: string): Promise<RecruiterResearch | null>;
  upsertRecruiterResearch(applicationId: string, input: Omit<RecruiterResearch, "id" | "jobApplicationId">, accessToken: string): Promise<RecruiterResearch>;
}

export interface ExplorationRepository {
  getOrCreateActiveSession(accessToken: string): Promise<ExplorationSession>;
  listMessages(sessionId: string, accessToken: string): Promise<ExplorationMessage[]>;
  addMessage(sessionId: string, role: "assistant" | "user", content: string, accessToken: string): Promise<ExplorationMessage>;
  pauseSession(sessionId: string, accessToken: string): Promise<void>;

  listInsights(accessToken: string): Promise<ExplorationInsight[]>;
  createInsights(sessionId: string, insights: Omit<ExplorationInsight, "id" | "sessionId" | "userId" | "createdAt">[], accessToken: string): Promise<ExplorationInsight[]>;
  setInsightStatus(id: string, status: InsightStatus, accessToken: string): Promise<ExplorationInsight>;
}
```

### 3.3 Casos de uso (`application/use-cases/employability/`)

Un archivo por verbo+sustantivo, igual que el resto del proyecto:

**Ikigai:** `GetIkigaiProfile`, `UpdateIkigaiProfile`

**Perfil:** `GetEmploymentProfile`, `UpdateEmploymentProfileSummary`, `AddExperienceEntry`, `UpdateExperienceEntry`, `DeleteExperienceEntry`, `AddSkillItem`, `DeleteSkillItem`, `AddEducationEntry`, `UpdateEducationEntry`, `DeleteEducationEntry`, `ConfirmAchievementEvidence`

**Vacantes:** `CreateJobTarget`, `ExtractJobKeywords` (llama al AI engine), `ListJobTargets`, `GetJobTarget`

**CV:** `GenerateCvDraft` (arma `CvContent` inicial desde perfil + keywords), `RequestEvidenceForClaim` (llama al AI engine, pregunta), `DraftCvBullet` (llama al AI engine, redacta), `ApproveCvBullet`, `RunCvQualityCheck` (bloquea cifras no confirmadas — regla dura en código), `MarkCvAsSent`, `ListCvVersions`, `GetCvVersion`

**Postulaciones:** `CreateJobApplication`, `UpdateApplicationStatus` (el `JobApplicationStatusEvent` lo inserta un trigger, no el caso de uso), `ListApplications`, `GetStaleApplications` (5-7+ días sin cambio), `StartRecruiterResearch`, `GenerateOutreachMessage` (llama al AI engine)

**Descúbrete:** `StartOrResumeExplorationSession`, `SendExplorationMessage` (llama al AI engine para la siguiente pregunta), `ExtractExplorationInsights` (llama al AI engine), `ListPendingInsights`, `AcceptExplorationInsight` (crea `SkillItem`/`ExperienceEntry` con `origin: exploration`), `DismissExplorationInsight`

**Métricas:** `GetConversionMetrics` (del propio usuario: proactiva vs. reactiva)

---

## 4. Migraciones SQL

### 4.1 Verificación de no-colisión

Se verificó contra **todas** las `create table`/`alter table` existentes en `supabase/sql/001_extensions.sql` a `037_list_assigned_psychological_cases.sql` (incluye `users`, `cohorts`, `forms`, `questions`, `form_responses`, `answers`, `form_skills`, `question_skill_weights`, `invitations`, todo `appointment_*`, `attendance_*`, `participant_case*`, `user_capabilities`, `internal_notifications`, `mentor_google_connections`, `mentoring_compliance_exempt_cohorts`). **Ningún nombre de tabla nueva choca** con las existentes.

### 4.2 Lista de migraciones (continúan la numeración desde `038`)

```
038_employment_ikigai.sql
039_employment_profile.sql
040_employment_evidence.sql
041_employment_job_targets.sql
042_employment_cv_versions.sql
043_employment_applications.sql
044_employment_exploration.sql
045_employment_llm_control.sql
046_user_profiles.sql
```
*(Una futura `047_employment_conversion_view.sql` queda pendiente — ver §9, punto 1).*

**`046_user_profiles.sql`** — tabla de **plataforma**, no exclusiva de empleo: `user_profiles` (1:1 con `users`, owner-only) con `phone`, `location`, `linkedin_url`. Es la fuente canónica que usa el gate de "perfil completo" (§5.4) y de la que `generateCvDraft` lee el contacto del CV — antes se dejaba `phone`/`location` vacíos porque no existía dónde guardarlos.

### 4.3 Contenido de cada migración

**`038_employment_ikigai.sql`**
- `ikigai_profiles` — 1:1 con `users`, owner-only, siempre editable.
  - Columnas: `id uuid pk`, `user_id uuid unique not null references public.users(id) on delete cascade`, `what_you_love text not null default ''`, `what_you_are_good_at text not null default ''`, `what_world_needs text not null default ''`, `what_you_can_be_paid_for text not null default ''`, `synthesis text`, `updated_at timestamptz not null default now()`.
  - RLS: `owner_select_update` con `using (user_id = auth.uid())` para select/insert/update/delete — sin policy de admin (privado por completo).

**`039_employment_profile.sql`**
- `employment_profiles` — 1:1 con `users`. `id`, `user_id unique`, `headline text`, `summary text`, `updated_at`.
- `experience_entries` — `id`, `profile_id references employment_profiles(id) on delete cascade`, `organization text not null`, `role text not null`, `location text`, `start_date text`, `end_date text`, `is_current boolean not null default false`, `context_description text`, `order_index int not null default 0`, `origin_type text not null check (origin_type in ('ikigai','exploration','manual'))`, `origin_ref_id uuid`.
- `skill_items` — `id`, `profile_id`, `name text not null`, `category text not null check (category in ('hard','soft','tool','language'))`, `origin_type`, `origin_ref_id`.
- `education_entries` — `id`, `profile_id`, `institution text not null`, `degree text not null`, `field_of_study text`, `start_date text`, `end_date text`, `is_current boolean not null default false`.
- RLS: todas owner-only vía `profile_id -> employment_profiles.user_id = auth.uid()` (policy con `exists` subquery, patrón igual al de `attendance_justifications` sobre `attendance_records`).

**`040_employment_evidence.sql`**
- `achievement_evidence` — `id`, `experience_entry_id references experience_entries(id) on delete cascade`, `claim text not null`, `metric_value text`, `metric_confirmed_by_user boolean not null default false`, `created_at timestamptz not null default now()`.
- RLS: owner-only vía join a `experience_entries -> employment_profiles.user_id = auth.uid()`.

**`041_employment_job_targets.sql`**
- `job_targets` — `id`, `user_id references public.users(id) on delete cascade`, `source_site text not null check (source_site in ('linkedin','indeed','occ','otro'))`, `raw_text text not null`, `company_name text`, `role_title text`, `created_at timestamptz not null default now()`.
- `job_keywords` — `id`, `job_target_id references job_targets(id) on delete cascade`, `keyword text not null`, `relevance text not null check (relevance in ('high','medium','low'))`, `matched_in_profile boolean not null default false`.
- RLS: owner-only vía `user_id = auth.uid()` (job_targets) y join (job_keywords).

**`042_employment_cv_versions.sql`**
- `cv_versions` — `id`, `user_id references public.users(id) on delete cascade`, `job_target_id references job_targets(id)`, `title text not null`, `status text not null check (status in ('draft','quality_review','approved','sent')) default 'draft'`, `content jsonb not null`, `quality_check jsonb`, `created_at timestamptz not null default now()`, `updated_at timestamptz not null default now()`.
- RLS: owner-only vía `user_id = auth.uid()`.
- Nota de diseño: `content` es JSONB completo (contacto, resumen, experiencia con bullets, educación, skills) — **no se normaliza en tablas por bullet**. Mismo patrón que `answers.value` / `QuestionConfig` ya usado en el proyecto. Razón: cada versión debe quedar congelada tal cual se generó; si luego se edita `ExperienceEntry`, las versiones viejas no deben cambiar.

**`043_employment_applications.sql`**
- `job_applications` — `id`, `user_id references public.users(id) on delete cascade`, `job_target_id references job_targets(id)`, `cv_version_id references cv_versions(id)`, `source text not null check (...)`, `application_type text not null check (application_type in ('proactive','reactive'))`, `company_name text not null`, `role_title text not null`, `status text not null check (status in ('applied','response','interview','offer','rejected')) default 'applied'`, `applied_at date not null`, `status_updated_at timestamptz not null default now()`.
- `job_application_status_events` — `id`, `job_application_id references job_applications(id) on delete cascade`, `status text not null`, `occurred_at timestamptz not null default now()`.
- `recruiter_research` — `job_application_id uuid primary key references job_applications(id) on delete cascade` (1:1), `recruiter_name text`, `recruiter_role text`, `company_tenure_note text`, `recent_company_fact text`, `common_ground_note text`, `outreach_message text`, `completed_at timestamptz`.
- RLS: owner-only vía `user_id = auth.uid()` (job_applications) y join (los otros dos). `job_application_status_events` es **solo lectura** para el dueño — se escribe únicamente vía trigger, nunca por insert directo del cliente.
- **Refinamiento aplicado en la migración real** (`043_employment_applications.sql`): en vez de la RPC `update_application_status()` descrita originalmente aquí, se usa un **trigger** `record_job_application_status_event()` (`before insert or update of status on job_applications`) que registra el evento y actualiza `status_updated_at` automáticamente. Es el mismo patrón que el proyecto ya usa para este problema exacto en `record_appointment_status_change()` (`017_appointments.sql`) — más simple que una RPC dedicada: el usuario actualiza `job_applications.status` directamente (permitido por su propia policy RLS) y el trigger se encarga del histórico.

**`044_employment_exploration.sql`**
- `exploration_sessions` — `id`, `user_id references public.users(id) on delete cascade`, `status text not null check (status in ('active','completed','paused')) default 'active'`, `started_at timestamptz not null default now()`, `last_interaction_at timestamptz not null default now()`.
- `exploration_messages` — `id`, `session_id references exploration_sessions(id) on delete cascade`, `role text not null check (role in ('assistant','user'))`, `content text not null`, `created_at timestamptz not null default now()`.
- `exploration_insights` — `id`, `session_id references exploration_sessions(id) on delete cascade`, `user_id references public.users(id) on delete cascade`, `category text not null check (category in ('value','interest','strength','work_preference','constraint','goal'))`, `content text not null`, `source_message_id references exploration_messages(id)`, `status text not null check (status in ('pending_review','accepted','dismissed')) default 'pending_review'`, `created_at timestamptz not null default now()`.
- RLS: owner-only vía `user_id = auth.uid()` en las tres tablas. **Sin policy de admin/psicóloga** — nadie más puede leer estas conversaciones en v1.

**`045_employment_llm_control.sql`**
- `employment_llm_settings` — singleton con `minimax_enabled`, `updated_at` y `updated_by`. Solo `super_admin` puede leerlo o modificarlo mediante RLS y trigger.
- Función `is_employment_llm_enabled()` — `security definer`; permite consultar el interruptor sin exponer configuración a participantes.
- `employment_llm_cache` — caché privada por usuario: clave, tarea, versión de prompt, modelo, salida JSON y expiración. RLS owner-only.
- Si el interruptor está apagado, el gateway bloquea antes de leer caché o llamar a MiniMax.

### 4.4 Reglas generales de todas las migraciones de este módulo

- Idempotentes: `create table if not exists`, `drop policy if exists` antes de `create policy` — igual que el resto de `supabase/sql/`.
- `snake_case`, PK `uuid default gen_random_uuid()`.
- RLS obligatorio en toda tabla, **sin excepción de `is_admin()`** salvo que se decida lo contrario en §9.
- Ninguna migración de este módulo modifica una tabla existente fuera de él.

---

## 5. Vistas UI

### 5.1 Rutas de usuario (`src/app/employment/`)

| Ruta | Función | Estado |
|---|---|---|
| `/employment` | Dashboard: completitud de perfil y postulaciones activas | ✅ Mockup construido |
| `/employment/ikigai` | Panel siempre visible y editable de las 4 preguntas + síntesis | ✅ Mockup construido |
| `/employment/explore` | Chat guiado de exploración | ⏸️ Oculto; reservado para v2 |
| `/employment/explore/insights` | Bandeja de insights pendientes de aprobar | ⏸️ Oculto; reservado para v2 |
| `/employment/profile` | Experiencia, habilidades, educación + popups de alta | ✅ Mockup construido |
| `/employment/targets` | Listado de vacantes analizadas | ✅ Mockup construido |
| `/employment/targets/new` | Pegar vacante → extracción de keywords | ✅ Mockup construido |
| `/employment/targets/[id]` | Detalle de vacante + botón "Generar CV" | ✅ Mockup construido |
| `/employment/cv` | Biblioteca de versiones de CV | ✅ Mockup construido |
| `/employment/cv/[id]/build` | Wizard: recolección de evidencia + edición/aprobación de bullets | ✅ Mockup construido |
| `/employment/cv/[id]/review` | Control de calidad — bloquea "enviado" | ✅ Mockup construido |
| `/employment/applications` | Registro/tracking + popup "Registrar postulación" | ✅ Mockup construido |
| `/employment/applications/[id]/outreach` | Checklist de investigación + mensaje IA (solo LinkedIn) | ✅ Mockup construido |
| `/employment/complete-profile` | Gate de perfil completo (nombre, teléfono, ubicación, LinkedIn opcional) — forzoso la primera vez, voluntario después | ✅ Construido |

Área de admin (`/admin/employability`) — **no construida**, pendiente de §9.

### 5.2 Componentes de presentación creados

- `src/app/employment/layout.tsx` — `RequireAuth` + `ParticipantLayout` + `RequireCompleteEmploymentProfile` + `EmploymentNav`, mismo patrón que `src/app/respond/layout.tsx`.
- `src/presentation/state/RequireCompleteEmploymentProfile.tsx` — gate de perfil completo (ver §5.4).
- `src/presentation/molecules/EmploymentNav.tsx` — navegación por pestañas entre las secciones del módulo.
- `src/presentation/mock/employmentMock.ts` — tipos y datos mockeados que quedan como referencia para lo que sigue pendiente (Descúbrete, v2). El resto de las vistas ya no lo usa.
- Se agregó un banner de entrada a `/employment` dentro de `src/app/respond/page.tsx` para que el módulo sea descubrible desde "Mis formularios", junto con un botón "Editar mis datos de contacto" visible solo si el gate de perfil ya se completó.

### 5.4 Gate de perfil completo

Resuelto: antes de entrar a cualquier ruta bajo `/employment/*`, `RequireCompleteEmploymentProfile` consulta `GET /api/employment/complete-profile` (caso de uso `getProfileCompletionStatus`, `ProfileCompletionActions.ts`). Si falta el nombre completo (regla: nombre y apellido, no solo validación de formato), el teléfono o la ubicación, redirige a `/employment/complete-profile?next=<ruta original>` — la misma pantalla sirve para el llenado forzoso inicial y para la edición voluntaria posterior (se autoexcluye del chequeo para no generar un loop de redirección). Al guardar:
- Si el nombre cambió, se actualiza `public.users.full_name` directo (`updateOwnFullName`) — el RLS y el trigger de endurecimiento de auth ya lo permiten.
- Teléfono/ubicación/LinkedIn se guardan en `user_profiles` (migración `046`).
- `generateCvDraft` ya lee `phone`/`location`/`linkedinUrl` desde `UserProfileRepository` en vez de dejarlos vacíos.

Si la verificación falla por un error de red, el gate **no bloquea** — se comporta como si estuviera completo (los endpoints reales siguen protegidos por sus propias reglas). Fuera de alcance en esta pasada: que un admin corrija el nombre de otro usuario (sigue pendiente, ver §9) y el dashboard de completitud para el facilitador.

### 5.3 Servicios y API

Estado actual: Ikigai y **Mi perfil** ya están conectados. `Mi perfil` carga y
crea experiencia, habilidades y educación por medio de
`employmentProfileService.ts`; la vista no realiza llamadas HTTP directas. Sus
consultas quedarán operativas una vez aplicada la migración
`039_employment_profile.sql`.

Cuando se conecte al backend real, seguir el patrón de `formService.ts`/`responseService.ts`:

```
presentation/services/
├── ikigaiService.ts
├── employmentProfileService.ts
├── jobTargetService.ts
├── cvService.ts
├── applicationService.ts
└── explorationService.ts

app/api/employment/
├── ikigai/route.ts
├── profile/route.ts
├── profile/experience/[id]/route.ts
├── profile/skills/[id]/route.ts
├── profile/education/[id]/route.ts
├── targets/route.ts
├── targets/[id]/keywords/route.ts
├── cv/route.ts
├── cv/[id]/route.ts
├── cv/[id]/quality-check/route.ts
├── applications/route.ts
├── applications/[id]/status/route.ts
├── applications/[id]/outreach/route.ts
└── exploration/
    ├── session/route.ts
    ├── messages/route.ts
    └── insights/route.ts
```

**Implementado para v1:** `targets`, `targets/[id]`, `cv`, `cv/[id]`, `cv/[id]/quality-check`, `cv/[id]/sent`, `cv/evidence-question` y `applications/[id]/outreach`. Las rutas de Descúbrete quedan como diseño de v2.

Cada `route.ts` es un controlador delgado que invoca su caso de uso de `application/use-cases/employability/*` — nunca toca Supabase directo (regla 12 de `FOUNDATION.md`).

---

## 6. Motor de IA (prompts por función)

El engine ya está implementado como una capa independiente de Next.js, UI y Supabase: recibe datos de negocio y devuelve contenido validado. No escribe archivos, no invoca herramientas y no persiste entidades del módulo.

```
src/infrastructure/llm/employment/
├── EmploymentLlmEngine.ts        # prompts, llamada y validación de JSON
├── EmploymentLlmGateway.ts       # interruptor global + caché privada
├── MiniMaxProvider.ts            # adaptador HTTP de MiniMax
├── types.ts
└── prompt-core/
    ├── common.ts
    └── employmentPrompts.ts
```

MiniMax se configura únicamente del lado del servidor:

```env
MINIMAX_API_KEY=...
MINIMAX_MODEL=MiniMax-M2.7
```

No usar `NEXT_PUBLIC_`: la llave nunca llega al navegador. El adaptador usa chat completions de texto, sin streaming.

### 6.1 Funciones y contrato de cada prompt

1. **`extractJobKeywordsPrompt`** — input: texto crudo de la vacante. Salida JSON con keywords, relevancia, empresa y puesto opcionales. Solo extrae términos explícitos; la coincidencia con el perfil se calcula en servidor.
2. **`evidenceQuestionPrompt`** — input: el "claim" cualitativo del logro. Salida: 1-2 preguntas concretas para pedir cantidad/frecuencia/resultado. Nunca redacta el bullet en este paso.
3. **`draftCvBulletPrompt`** — input: contexto del puesto + `AchievementEvidence` (o `null`) + keywords de la vacante. **Guardrail crítico, repetido explícitamente en el prompt**: si `metricConfirmedByUser` es falso o no hay evidencia, redacta en términos cualitativos; bajo ninguna circunstancia inventa una cifra. La validación real de "no hay cifra sin evidencia confirmada" se hace en código (regex de dígitos + chequeo de `evidenceId`), nunca confiando solo en que el LLM obedezca.
4. **`draftCvSummaryPrompt`** — cruza perfil + keywords de la vacante para adaptar resumen/headline por aplicación.
5. **`cvCoherenceCheckPrompt`** — revisa coherencia/tono/redundancia del CV completo, explícitamente sin tocar cifras, ortografía o extensión (eso se resuelve en código, no vía LLM). El servidor calcula extensión aproximada, cifras no confirmadas, y ortografía/redacción mediante `checkSpelling()` (`domain/value-objects/textQualityChecks.ts`) — un chequeo determinístico (espacios dobles, palabras repetidas, oraciones sin mayúscula inicial), no un corrector con diccionario completo. `runCvQualityCheck` corre ambos (LLM + determinístico) en la misma llamada.
6. **`outreachMessagePrompt`** — input: checklist de `RecruiterResearch` + tono deseado. Redacta el mensaje de contacto LinkedIn.
7. **`ikigaiSynthesisPrompt`** — propone una síntesis editable basada solo en las cuatro respuestas. La UI la solicita mediante `POST /api/employment/ikigai/synthesis`; el usuario siempre puede editarla antes de guardarla.

Los prompts de Descúbrete se posponen a v2.

### 6.2 Operación y control

- El proveedor inicial es MiniMax, mediante `MINIMAX_API_KEY` y `MINIMAX_MODEL` (por defecto `MiniMax-M2.7`). El adaptador usa únicamente chat completions de texto; el LLM no crea archivos ni ejecuta herramientas.
- `045_employment_llm_control.sql` incorpora caché privada por usuario, versionada por tarea/prompt/modelo, y un interruptor global `minimax_enabled`.
- Solo `super_admin` puede ver o cambiar ese interruptor en `/admin/employment-ai`. Si está apagado, el servidor bloquea toda llamada saliente a MiniMax, incluso antes de consultar caché.
- No hay límites de uso individuales en v1.

---

## 7. Estado actual de avance

**Ya construido y conectado a backend real:**

- Ikigai, Mi perfil (experiencia/habilidades/educación), Vacantes + keywords, CV (generación, wizard de evidencia/bullets, control de calidad, marcar enviado), Postulaciones (registro, cambio de estatus, outreach con investigación cargada de verdad) — las 14 rutas de §5.1, todas conectadas a `presentation/services/*` → `app/api/employment/*` → casos de uso → repositorios Supabase.
- **Gate de perfil completo** (§5.4): bloquea la entrada a `/employment/*` hasta que el usuario tenga nombre completo, teléfono y ubicación; editable después desde `/respond`. `generateCvDraft` ya usa esos datos reales en vez de dejarlos vacíos.
- **Control de calidad del CV**, de punta a punta: `runCvQualityCheck` combina el chequeo determinístico de ortografía/redacción (`checkSpelling`, sin LLM) + coherencia vía MiniMax + cifras no confirmadas + extensión; `markCvAsSent` bloquea de verdad si algo falta.
- **Engine de IA v1:** MiniMax, prompts estructurados y validación JSON para keywords, evidencia, bullets, resumen, coherencia, outreach e ikigai.
- **Control operativo:** migración `045`, caché privada por usuario y pantalla `/admin/employment-ai` exclusiva para `super_admin`.
- **Contacto proactivo verificable:** toda postulación inicia como `reactive`, incluso desde LinkedIn. El mensaje de contacto es un borrador editable; únicamente `POST /api/employment/applications/[id]/outreach/confirm`, después de la confirmación explícita del usuario, guarda `recruiter_research.completed_at` y cambia `application_type` a `proactive`.
- **Panel de decisiones personal:** `/employment/insights` calcula en servidor el embudo, conversiones, actividad semanal, resultados por fuente/tipo y seguimientos vencidos desde postulaciones e historial de estatus. Presenta una siguiente acción explicable y sugerencias revisables; no toma decisiones por el usuario.

**Pospuesto a v2 (deliberado, no pendiente de esta iteración):**

- Descúbrete (`/employment/explore*`) — código y mocks se conservan como referencia de diseño, pero la ruta redirige a `/employment`; sin backend.
- Área de admin/facilitador (`/admin/employability`) y su dashboard de conversión — pendiente la decisión de §9.
- Que un admin pueda corregir el `full_name` de otro usuario (hoy solo el propio usuario puede vía el gate).

**Pendiente de ejecutar manualmente:**

- Migraciones `038` a `046` en Supabase, en orden (ninguna se ha corrido todavía).

---

## 8. Decisiones tomadas durante el diseño

1. **CV como JSONB, no tablas normalizadas por bullet** — consistente con el patrón `Answer.value`/`QuestionConfig` ya usado en el proyecto; cada versión queda congelada al generarse.
2. **Ikigai fuera del sistema de Forms** — pasa a ser una entidad propia (`ikigai_profiles`), siempre editable, porque el sistema de Forms bloquea respuestas tras enviarlas (incompatible con "editable en cualquier momento").
3. **Educación (`EducationEntry`) sí se incluye en v1** — confirmado explícitamente por el usuario.
4. **"Descúbrete" es un pilar propio del dominio**, separado del ikigai y CV, pero se pospone completamente a v2.
5. **Nombre del botón de exploración: "Descúbrete"** — confirmado por el usuario.
6. **Ninguna migración toca tablas existentes** — verificado exhaustivamente contra el esquema actual (§4.1); el módulo entero cuelga solo de `users.id` y podría eliminarse sin dejar rastro en el resto del sistema.
7. **Todas las tablas de este módulo son privadas por defecto** (RLS solo owner, sin `is_admin()`) — salvo que §9 se resuelva distinto.
8. **MiniMax es el proveedor inicial.** El engine es agnóstico mediante `TextLlmProvider`; el adaptador no conoce dominio ni UI.
9. **Control global, no por usuario.** Un `super_admin` apaga/enciende MiniMax desde `/admin/employment-ai`; no hay cuotas individuales en v1.

---

## 9. Preguntas abiertas / pendientes

1. **Visibilidad del admin/facilitador**: ¿el dashboard de conversión debe mostrar postulaciones individuales por participante, o solo tasas agregadas por cohorte? — **Pendiente, explícitamente pospuesto por el usuario.** Mientras no se resuelva, `job_application_status_events` se sigue registrando (es la base de cualquier métrica futura), pero no se construye `/admin/employability` ni ninguna vista/RPC agregada.
2. **¿Quién más puede leer las conversaciones de "Descúbrete"?** — Hoy: nadie salvo el propio usuario (RLS owner-only). Si más adelante se decide que un facilitador pueda verlas (con consentimiento), requiere una migración adicional de policies, no un cambio de estructura.

---

## 10. Siguientes pasos sugeridos

1. Configurar `MINIMAX_API_KEY` y opcionalmente `MINIMAX_MODEL` en `.env.local`/hosting; reiniciar o redeplegar. Nunca usar `NEXT_PUBLIC_`.
2. Correr las migraciones `038`–`045` en Supabase, en orden.
3. Entrar como `super_admin` a `/admin/employment-ai` y confirmar que MiniMax está activo.
4. Sustituir por fases los mocks de las vistas por los servicios/API reales.
5. Terminar CRUD de postulaciones/evidencia y conectar el wizard de bullets.
6. Resolver §9 antes de construir métricas administrativas.

---

## 11. Plan de ejecución: CV guiado por IA y control humano

Esta sección es el plan vigente para endurecer el módulo. Sustituye cualquier
interpretación de los "siguientes pasos" que permita a la IA inventar,
aprobar o decidir por el usuario. No incluye preparación de entrevistas: ese
alcance queda deliberadamente fuera de esta fase.

### 11.1 Decisión de datos y migraciones

**No crear una migración para esta fase.** El esquema actual ya contiene los
datos necesarios para ejecutar el plan:

- `employment_profiles`, `experience_entries`, `skill_items` y
  `education_entries` son la fuente de verdad del perfil;
- `achievement_evidence` es el soporte persistido de cada métrica;
- `job_targets` y `job_keywords` conservan la vacante y sus requisitos;
- `cv_versions.content` guarda la versión congelada del CV;
- `job_applications`, `job_application_status_events` y
  `recruiter_research` permiten medir la búsqueda y el contacto proactivo;
- `employment_llm_cache` puede almacenar análisis transitorios y privados de
  la IA, versionados por prompt, sin agregar tablas de resultados.

En particular, usar `recruiter_research.completed_at` como la fecha en que el
usuario **confirma que envió** el contacto, no como la fecha en que la IA lo
redactó. No agregar campos ni tablas salvo que una necesidad no pueda
resolverse con estas entidades; esa excepción requiere una decisión explícita
antes de escribir una migración.

### 11.2 Regla no negociable: IA con control humano

La IA es copiloto, entrevistador de evidencia, redactor y auditor. **No toma
decisiones.** Toda pantalla que presente una salida de IA debe mostrarla como
una sugerencia y ofrecer acciones explícitas: `Aceptar`, `Editar`, `Descartar`
o `Guardar como borrador`.

La IA no puede:

- afirmar que una experiencia, habilidad o métrica es verdadera;
- agregar datos al perfil o al CV sin una confirmación del usuario;
- decidir que una persona cumple una vacante, debe postularse o debe ser
  descartada;
- aprobar bullets, controles de calidad, CVs ni mensajes;
- marcar una postulación como proactiva ni como enviada;
- rellenar investigación sobre un recruiter o empresa con información no
  proporcionada por el usuario.

Las validaciones que bloqueen acciones deben vivir en el servidor y ser
determinísticas. Un prompt es una ayuda de redacción, nunca un control de
integridad.

### 11.3 P0 — Integridad de evidencia y CV

**Objetivo:** hacer imposible guardar o enviar un CV que presente cifras no
sustentadas.

1. Sustituir la creación local de bullets en
   `/employment/cv/[id]/build`. El frontend no debe concatenar texto y
   métrica ni fabricar IDs temporales de evidencia.
2. Crear y conectar la ruta de servidor para `draftCvBullet`. El flujo será:
   usuario describe el logro → IA pregunta evidencia faltante → usuario
   confirma o declina el dato → se persiste `achievement_evidence` → IA
   propone alternativas → usuario acepta, edita o descarta una alternativa.
3. Si hay métrica, crear una fila real de `achievement_evidence` con
   `metric_confirmed_by_user = true`, `claim` y `metric_value` antes de
   guardar el bullet. Si no la hay, el bullet debe quedar cualitativo y no
   contener cifras, porcentajes, moneda, rangos ni cantidades escritas.
4. Validar en servidor todo `PUT /employment/cv/[id]`. No aceptar `content`
   arbitrario: cada bullet debe pertenecer a una experiencia del usuario; si
   contiene números, su `evidenceId` debe existir, ser de esa experiencia y
   estar confirmado.
5. Al cambiar el contenido, invalidar `quality_check` y devolver el CV a
   `draft`; el control se debe ejecutar de nuevo sobre la versión actual.
6. Bloquear `sent` hasta que se cumplan todos los gates: control posterior al
   último cambio, todos los bullets aprobados por el usuario, ninguna cifra
   sin evidencia y contenido mínimo útil.
7. Corregir el error de lint de `RequireCompleteEmploymentProfile.tsx` antes
   de cerrar este bloque.

**Criterio de aceptación:** ninguna ruta ni manipulación de interfaz permite
guardar, aprobar o enviar una cifra de CV sin evidencia persistida y confirmada
por el usuario.

### 11.4 P1 — Perfil editable y con evidencia útil

**Objetivo:** dar a la IA datos suficientes para redactar sin inventar.

1. Implementar editar, eliminar y reordenar experiencia, habilidades y
   educación con las tablas y repositorios actuales.
2. Exponer la edición de `employment_profiles.headline` y `summary`; los
   agentes pueden proponerlos, pero el usuario los guarda explícitamente.
3. Mejorar la captura de `context_description`: solicitar responsabilidad,
   herramientas o proceso usado, tipo de cliente/equipo y resultado
   observable. No requiere nuevas columnas.
4. Mostrar las habilidades como declaradas o demostradas según la evidencia
   encontrada en experiencia. Este cruce se calcula en servidor o desde el
   análisis de IA; no se persiste como hecho nuevo.
5. Reemplazar porcentajes de completitud decorativos por faltantes accionables
   para poder postular: contacto, experiencia, habilidades, evidencia,
   vacante analizada, CV aprobado y PDF listo.

**Criterio de aceptación:** el usuario puede corregir cualquier dato y cada
afirmación usada para un CV se puede rastrear a su perfil o evidencia.

### 11.5 P2 — Matriz de ajuste de vacante

**Objetivo:** pasar de coincidencia literal de keywords a ajuste explicable y
honesto por requisito.

1. Mantener `job_keywords`, pero extender la respuesta de IA con una matriz
   transitoria en `employment_llm_cache`: requisito, prioridad
   (`indispensable`, `importante`, `deseable`), evidencia encontrada, estado
   (`demostrado`, `parcial`, `no_demostrado`) y sugerencia honesta.
2. La salida debe señalar qué experiencia, habilidad o educación respalda cada
   coincidencia. Si no existe evidencia, debe decirlo; nunca sugerir agregarla
   como si fuera real.
3. Mostrar la matriz antes de generar el CV. El usuario selecciona qué
   experiencias utilizar; la IA no escoge por él.
4. Reemplazar `matchedInProfile` basado solo en inclusión de texto por una
   coincidencia semántica con fuente visible. La coincidencia es una
   sugerencia revisable, no una verdad almacenada.

**Criterio de aceptación:** para cada requisito importante, el usuario ve
evidencia concreta o una brecha que no se intenta ocultar en el CV.

### 11.6 P3 — Redacción de CV guiada por IA

**Objetivo:** generar contenido competitivo, específico y verificable.

1. Generar alternativas de headline, resumen y 2–3 opciones por bullet.
2. El prompt de bullet debe exigir verbo de acción, contexto, resultado
   comprobable, keyword respaldada y máximo de 25–32 palabras. Debe evitar
   clichés como "responsable de".
3. La IA hará preguntas de evidencia cuando detecte logros vagos, pero el
   usuario puede declinar responder y conservar una redacción cualitativa.
4. Agregar auditoría adversarial de IA que identifique vaguedad, redundancia,
   keyword stuffing, tono inflado y afirmaciones sin soporte. Debe devolver
   observaciones, no modificar el CV automáticamente.
5. Mostrar las notas de coherencia que ya produce `runCvQualityCheck`; hoy no
   se presentan al usuario.

**Criterio de aceptación:** cada frase relevante del CV tiene una fuente
identificable y fue aceptada o editada por el usuario.

### 11.7 P4 — Control de calidad y entrega real

**Objetivo:** que el estado de calidad represente un documento empleable.

1. Renombrar el chequeo actual a "Revisión básica de redacción" mientras solo
   detecte espacios dobles, repeticiones y mayúsculas. No llamarlo
   "Ortografía y gramática" hasta contar con una revisión real.
2. Usar la IA para proponer correcciones de claridad y coherencia, siempre con
   comparación entre texto original y sugerido y aprobación humana.
3. Reemplazar la regla de una página basada en tamaño de JSON por una vista
   HTML imprimible con medición de layout real.
4. Implementar exportación PDF ATS de una columna, sin tablas, iconos, foto ni
   elementos que dañen parsers. DOCX editable es deseable, pero no bloquea el
   PDF.
5. `sent` debe significar que el usuario confirmó que utilizó esa versión para
   postular, no que la IA la consideró lista.

**Criterio de aceptación:** el usuario descarga un PDF ATS de una página cuyo
contenido pasó los gates de evidencia y aprobación.

### 11.8 P5 — Postulación proactiva verificable

**Objetivo:** no confundir intención con contacto real.

1. Crear toda postulación inicialmente como `reactive`, incluso si su fuente
   es LinkedIn.
2. Para LinkedIn, pedir investigación aportada por el usuario, generar el
   mensaje de IA, permitir editarlo y solicitar la confirmación explícita
   "Ya envié este mensaje".
3. Solo después de esa confirmación, actualizar `application_type` a
   `proactive` y registrar `recruiter_research.completed_at`.
4. La IA debe adaptar el mensaje con los datos aportados. Cuando falte un
   dato, lo omite: no lo inventa ni lo busca por cuenta propia.

**Criterio de aceptación:** una postulación solo se contabiliza como proactiva
después de una confirmación humana de envío.

### 11.9 P6 — Panel de decisiones y embudo personal

**Objetivo:** transformar el seguimiento existente en acciones de búsqueda
mejores.

1. Calcular desde `job_applications` y `job_application_status_events`:
   aplicaciones por semana, conversión aplicación→respuesta,
   respuesta→entrevista y entrevista→oferta, fuente, tipo de postulación y
   días sin actualización.
2. La IA puede presentar hipótesis basadas exclusivamente en esos datos, por
   ejemplo diferencias entre fuentes o CVs. Debe formularlas como
   recomendaciones revisables, no decisiones ni diagnósticos definitivos.
3. El panel debe mostrar una siguiente acción concreta y explicable:
   completar evidencia, revisar una brecha, generar el PDF, confirmar un
   contacto o actualizar un estatus.

**Criterio de aceptación:** el usuario puede identificar su siguiente acción
de mayor impacto sin que la IA decida por él.

### 11.10 Orden de entrega

1. P0 — integridad de evidencia, validación de servidor y lint.
2. P1 — perfil editable y utilizable.
3. P2 y P3 — matriz de ajuste y redacción asistida por IA.
4. P4 — calidad real y exportación ATS.
5. P5 — contacto proactivo verificable.
6. P6 — embudo personal y recomendaciones.

Cada bloque se cierra únicamente al cumplir su criterio de aceptación y al
añadir pruebas de los casos de éxito, rechazo y manipulación de requests.
