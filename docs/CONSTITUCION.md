# Documento Constitutivo — Sistema "Restart" (Dekids)

## 1. Contexto y objetivo

**Restart** es un sistema interno de Dekids para administrar formularios de evaluación (personalidad, habilidades, seguimiento) dirigidos a los becarios/alumnos de los programas de Dekids (tipo JCF/Forge). Permite a un administrador crear formularios dinámicos, organizarlos por cohortes, y visualizar tanto estadísticas agregadas por cohorte como el perfil individual de cada participante — incluyendo, cuando aplique, un perfil de habilidades tipo radar derivado de las respuestas.

Este documento es la fuente de verdad arquitectónica del proyecto. Cualquier código generado (por Claude Code o cualquier desarrollador) debe respetar las reglas aquí descritas antes que la conveniencia puntual de una tarea.

---

## 2. Stack técnico

- **Framework:** Next.js 14+ (App Router), TypeScript en modo `strict`
- **Estilos:** Styled Components 6, con sistema de theming (design tokens) — sin CSS modules, sin Tailwind
- **Persistencia:** Supabase (PostgreSQL + Auth). **Solo se usa como base de datos y proveedor de autenticación**, y únicamente desde la capa de infraestructura — nunca se llama directo desde componentes de UI ni desde rutas de API sin pasar por un caso de uso
- **Comunicación UI ↔ backend:** HTTP real vía **axios**, encapsulado en una capa de servicios (ver sección 3.4). Nada de `fetch` directo en componentes
- **Drag & drop:** `@dnd-kit/core` (Form Builder)
- **Gráficas:** `recharts` (`RadarChart` para el perfil de habilidades)
- **Gestión de SQL:** scripts idempotentes en `/supabase/sql`, montados manualmente por el desarrollador — **no se usa Supabase CLI ni sistema de migraciones automatizado**

---

## 3. Arquitectura

### 3.1 Las cuatro capas (Clean Architecture) + capa de servicios

```
src/
├── domain/                      # TypeScript puro. Cero dependencias externas.
│   ├── entities/                  User, Cohort, Form, Question, FormResponse,
│   │                               Answer, FormAssignment, Invitation, FormSkill,
│   │                               QuestionSkillWeight
│   ├── value-objects/             QuestionType, QuestionConfig (unión discriminada)
│   └── repositories/               Interfaces: FormRepository, AuthRepository,
│                                    CohortRepository, ResponseRepository, StatsRepository, etc.
│
├── application/                  # Casos de uso. Orquestan domain + repos (interfaces).
│   └── use-cases/
│       ├── auth/                   LoginUser, LogoutUser, GetCurrentUser,
│       │                            RequestPasswordReset, ResetPassword,
│       │                            RegisterViaInvitation, RefreshSession
│       ├── cohorts/                CreateCohort, GenerateInvitationLink, RegisterViaInvitation
│       ├── forms/                  CreateForm, EditFormQuestions (con guard de bloqueo),
│       │                            DuplicateForm, PublishForm, ToggleAcceptingResponses,
│       │                            AssignFormToTarget
│       ├── responses/              GetVisibleFormsForParticipant, SubmitAnswerAndAdvance,
│       │                            ResumeFormResponse
│       └── stats/                  GetCohortStatsForForm, GetParticipantHistory,
│                                    ComputeFormSkillProfile
│
├── infrastructure/                # Implementaciones concretas. Aquí SÍ vive Supabase.
│   └── supabase/
│       ├── client.ts                (cliente server-only y client-safe, separados)
│       ├── repositories/            SupabaseFormRepository implements FormRepository, etc.
│       ├── auth/                     SupabaseAuthRepository implements AuthRepository
│       └── mappers/                  DB row -> Domain entity
│
└── presentation/                  # Next.js + Styled Components (Atomic Design) + servicios
    ├── theme/                       tokens/, themes/, ThemeProvider.tsx, styled.d.ts
    ├── services/                     Capa de comunicación UI -> API (ver 3.4)
    ├── state/
    │   └── AuthContext.tsx           accessToken + user en memoria, hook useAuth()
    ├── atoms/
    ├── molecules/
    ├── organisms/
    ├── templates/
    └── app/                          Rutas de Next.js — solo orquestan, sin lógica de negocio
        └── api/                       Endpoints HTTP — controladores delgados (ver 3.4)
```

### 3.2 Mapeo con Atomic Design

| Nivel | Qué es | Ejemplos en Restart |
|---|---|---|
| **Átomos** | Primitivos de Styled Components, sin lógica de negocio | `Button`, `Input`, `Radio`, `Checkbox`, `Label`, `Badge` |
| **Moléculas** | Composición de átomos con lógica de presentación | `FormField`, `LikertScale`, `DraggableQuestionRow`, `QuestionTypeSelector`, `OptionsListEditor` |
| **Organismos** | Secciones completas y funcionales, consumen servicios | `FormBuilderCanvas`, `QuestionEditorPanel`, `FormPreviewModal`, `CohortStatsPanel`, `ParticipantSkillRadar` |
| **Templates** | Layout sin datos reales | `AdminLayout`, `ParticipantLayout` |
| **Vistas/Páginas** | Rutas de Next.js, invocan servicios | `app/admin/forms/[id]/page.tsx`, `app/respond/[formId]/page.tsx` |

### 3.3 Sistema de theming

```
presentation/theme/
├── tokens/
│   ├── colors.ts          # paletas crudas por tema, valores hex/rgb
│   ├── spacing.ts
│   └── typography.ts
├── themes/
│   ├── default.theme.ts    # mapea tokens a slots semánticos (colors.primary, colors.background...)
│   └── index.ts             # registry: { default: defaultTheme } — listo para agregar más
├── ThemeProvider.tsx        # resuelve el theme activo por nombre y lo inyecta
└── styled.d.ts               # module augmentation de DefaultTheme (autocompletado + type-safety)
```

**Regla:** ningún átomo importa `colors.ts` directamente. Todo consumo de color es vía `props.theme.colors.x`. Nombres semánticos (`primary`, `background`, `textSecondary`), nunca literales (`green700`).

### 3.4 Capa de servicios (UI ↔ API con axios)

Esta capa es el único puente entre componentes de React y el backend. Ningún componente conoce URLs, axios, ni tokens directamente.

```
presentation/services/
├── axiosClient.ts       # instancia configurada + interceptors
├── authService.ts         # login(), logout(), requestPasswordReset(), resetPassword()
├── formService.ts          # createForm(), getForm(), publishForm(), duplicateForm(), assignForm()...
├── responseService.ts       # getVisibleForms(), submitAnswerAndAdvance(), resumeResponse()...
└── statsService.ts           # getCohortStats(), getParticipantSkillProfile()...
```

```
app/api/
├── auth/
│   ├── login/route.ts           # valida credenciales, emite accessToken + set-cookie refreshToken (httpOnly)
│   ├── logout/route.ts           # invalida refresh token, borra la cookie
│   ├── refresh/route.ts           # lee cookie httpOnly, emite nuevo accessToken
│   ├── forgot-password/route.ts    # dispara correo con link de reset (vía Supabase Auth)
│   └── reset-password/route.ts      # consume token del link, define nueva contraseña
├── forms/
│   ├── route.ts                    # GET (lista), POST (crear)
│   └── [id]/route.ts                # GET, PATCH, DELETE
├── responses/route.ts
└── stats/route.ts
```

**Manejo de sesión (JWT en headers):**
- El `accessToken` vive **en memoria**, dentro de `AuthContext`, nunca en `localStorage` ni `sessionStorage`.
- El `refreshToken` vive únicamente en una **cookie `httpOnly`**, inaccesible a JavaScript — el navegador la envía sola en cada request a `/api/auth/refresh`.
- `axiosClient` tiene dos interceptors:
  - **Request:** adjunta `Authorization: Bearer <accessToken>` desde `AuthContext` en cada llamada.
  - **Response:** si el status es `401`, intenta una vez `POST /api/auth/refresh`; si tiene éxito, reintenta la request original con el nuevo token; si falla, limpia `AuthContext` y redirige a `/login`. Cualquier otro error HTTP se propaga como toast genérico.

**Cada `route.ts` de `app/api/` es un controlador delgado**: parsea el request, invoca el caso de uso correspondiente de `application/use-cases/`, y devuelve la respuesta serializada. Nunca contiene lógica de negocio ni llama a Supabase directamente.

---

## 4. Modelo de dominio

```typescript
User {
  id, email, fullName,
  role: 'admin' | 'participant',
  cohortId: string | null,
  createdAt
}

Cohort { id, name, description, createdAt }

Invitation {
  id, token, cohortId, createdBy,
  isActive: boolean,
  createdAt
}

Form {
  id, title, description,
  status: 'draft' | 'published' | 'closed',
  acceptingResponses: boolean,
  allowsPartialSave: boolean,
  deadlineAt: string | null,          // reservado, sin lógica activa aún
  createdBy, createdAt, updatedAt
}

FormAssignment {
  id, formId,
  targetType: 'user' | 'cohort',
  targetId
}

FormSkill {
  id, formId, name, description,
  icon?: string, color?: string
}

Question {
  id, formId, order, label,
  type: QuestionType,
  config: QuestionConfig,
  required: boolean,
  timeLimitSeconds: number | null
}

type QuestionType = 'likert' | 'open_text' | 'single_choice' | 'checkbox'
// futuras extensiones se agregan aquí + su renderer, sin tocar el resto del sistema

type QuestionConfig =
  | { type: 'likert'; scaleMin: number; scaleMax: number; labels?: string[] }
  | { type: 'open_text'; maxLength?: number }
  | { type: 'single_choice'; options: string[] }
  | { type: 'checkbox'; options: string[]; minSelections?: number }

QuestionSkillWeight {
  id, questionId, skillId,   // FK a FormSkill
  weight: number
}
// Regla de validación: solo permitido si question.type === 'likert'

FormResponse {
  id, formId, participantId,
  status: 'in_progress' | 'completed',
  currentQuestionOrder: number,       // puntero de resume
  submittedAt: string | null
}

Answer {
  id, responseId, questionId,
  value,                                // JSONB, shape según QuestionType
  autoSubmittedByTimeout: boolean
}
```

---

## 5. Reglas de negocio no-negociables

1. **Auth nunca se llama directo desde UI.** Todo pasa por casos de uso (`LoginUser`, `LogoutUser`, `RequestPasswordReset`, `ResetPassword`, `RegisterViaInvitation`) que internamente usan `SupabaseAuthRepository`.
2. **RLS obligatorio en toda tabla.** Regla base: admin acceso total; participante solo lee formularios asignados a él o a su cohorte, y solo escribe/lee su propio `FormResponse`/`Answer`.
3. **Un formulario con respuestas queda bloqueado para edición estructural.** `EditFormQuestions` valida `countResponsesByForm(formId) === 0` antes de permitir cambios. La única salida es `DuplicateForm` (crea un nuevo `Form` en `draft`, copia `Question`, no copia asignaciones ni respuestas).
4. **Navegación del participante es lineal, sin retroceso.** Una pregunta a la vez; al enviar o al agotarse `timeLimitSeconds` (auto-envío, marcado con `autoSubmittedByTimeout: true`), avanza y no se puede regresar.
5. **Autoguardado por pregunta, sin botón explícito.** `currentQuestionOrder` persiste el punto de resume; al reingresar, las preguntas ya contestadas quedan bloqueadas (solo lectura), continúa en la siguiente.
6. **Tipos de pregunta son extensibles vía registry pattern.** Agregar un tipo nuevo implica: 1 entrada en `QuestionType`, su variante en `QuestionConfig`, y su componente en el registry de renderizado — nunca condicionales dispersos por el código.
7. **`FormSkill` es siempre por formulario, nunca global.** El radar de habilidades se calcula solo con datos del mismo formulario donde se definieron esas habilidades.
8. **Invitaciones son por cohorte, reutilizables, sin expiración automática.** El admin las desactiva manualmente (`isActive: false`).
9. **No hay mecánica de gamificación por puntos/logros/XP.** El único principio de "gamificación" es visual: feedback inmediato en los inputs (hover, selección, transición), botones grandes y satisfactorios. No se crean entidades ni lógica de puntuación para esto.
10. **Colores siempre vía `theme`, nunca importados directo en componentes.** Cambiar la identidad visual es cambiar `colors.ts` una vez, nunca buscar usos dispersos.
11. **Ningún componente de React llama `axios` ni `fetch` directo.** Todo pasa por un método de `presentation/services/*`.
12. **Ninguna ruta de `app/api/*` toca Supabase directo.** Cada `route.ts` es un controlador delgado que solo invoca el caso de uso correspondiente de `application/use-cases/`.
13. **El access token vive en memoria (`AuthContext`), nunca en `localStorage`.** El refresh token vive únicamente en cookie `httpOnly`, inaccesible a JS.
14. **El interceptor de `axiosClient` maneja errores globalmente:** adjunta `Authorization: Bearer <token>` en cada request; en respuesta `401`, intenta `POST /api/auth/refresh` una vez y reintenta la request original — si falla, limpia sesión y redirige a `/login`; cualquier otro error se muestra como toast genérico.

---

## 6. Funcionalidades detalladas

### 6.1 Autenticación
- **Login:** `authService.login(email, password)` → `POST /api/auth/login` → `LoginUser` → `SupabaseAuthRepository`. Devuelve `accessToken` (a `AuthContext`, en memoria) + cookie `httpOnly` con refresh token.
- **Cerrar sesión:** `authService.logout()` → `POST /api/auth/logout` → `LogoutUser` invalida el refresh token y borra la cookie; el cliente limpia `AuthContext`.
- **Recuperar contraseña (flujo estándar):** `authService.requestPasswordReset(email)` → `POST /api/auth/forgot-password` → envía correo con link (vía Supabase Auth). La pantalla de destino del link usa `authService.resetPassword(token, newPassword)` → `POST /api/auth/reset-password`.
- **Refresh silencioso:** manejado por el interceptor de `axiosClient`, transparente para el resto de la app.
- **Registro:** admin genera link de invitación por cohorte (`Invitation`); participante se autoregistra vía ese link. El trigger de base de datos revalida el token, deriva `cohortId` desde la invitación y fuerza `role: 'participant'`; nunca confía esos campos a metadata enviada por el cliente.

### 6.2 Vista de administrador
- Gestión de cohortes (crear, ver, generar/desactivar invitaciones)
- Gestión de usuarios (ver participantes por cohorte)

### 6.3 Form Builder
- Crear/editar título, descripción, estado (`draft`/`published`/`closed`)
- Agregar preguntas vía `QuestionEditorPanel` (panel lateral), con configuración específica según tipo
- Reordenar preguntas por drag & drop (`FormBuilderCanvas`, `@dnd-kit/core`)
- Definir `FormSkill` y mapear preguntas Likert a habilidades con peso (`QuestionSkillWeight`)
- Configurar `timeLimitSeconds` por pregunta, `allowsPartialSave` por formulario
- Switch de `acceptingResponses` independiente del `status`
- Vista previa (`FormPreviewModal`) reusando el `QuestionRenderer` real
- Asignar formulario a cohorte(s) y/o usuario(s) específicos (`FormAssignment`)
- Duplicar formulario si ya tiene respuestas y necesita editarse

### 6.4 Dashboard de estadísticas de participantes (por cohorte)
- Selector de cohorte + formulario
- Breakdown agregado por tipo de pregunta: promedio+distribución (likert), porcentajes (single_choice/checkbox), lista de respuestas (open_text)
- Tasa de finalización de la cohorte para ese formulario

### 6.5 Dashboard individual de participante
- Historial completo de `FormResponse` del participante
- Respuestas detalladas por formulario
- Perfil de habilidades (`RadarChart` vía `ComputeFormSkillProfile`) cuando el formulario tiene `FormSkill` definidas — visible solo para admin por ahora, arquitectura lista para exponerlo al participante después sin cambios de esquema

### 6.6 Vista de respuesta de formularios (participante)
- Lista de formularios visibles (`GetVisibleFormsForParticipant`: asignados directo a su `userId` o a su `cohortId`)
- Flujo lineal, una pregunta a la vez, con countdown visual si tiene `timeLimitSeconds`
- Autoenvío al agotarse el tiempo, avance automático
- Resume exacto en `currentQuestionOrder` si el formulario permite guardado parcial
- UI visualmente atractiva: botones grandes, feedback inmediato de selección, transiciones entre preguntas

---

## 7. Esquema de Supabase

Carpeta de scripts SQL, montados manualmente en el SQL Editor de Supabase, en orden numérico, cada uno **idempotente** (`IF NOT EXISTS`, `DROP POLICY IF EXISTS` antes de `CREATE POLICY`, etc.):

```
supabase/sql/
├── 001_extensions.sql
├── 002_users_and_cohorts.sql
├── 003_invitations.sql
├── 004_forms_and_questions.sql
├── 005_form_skills.sql
├── 006_form_assignments.sql
├── 007_responses_and_answers.sql
├── 008_functions_and_triggers.sql    -- ej. handle_new_user (SET search_path = public)
└── 009_rls_policies.sql
```

**Reglas de RLS base:**
- `users`: cada usuario lee/actualiza su propia fila; admin lee todas
- `forms`, `questions`, `form_skills`, `question_skill_weights`: admin CRUD total; participante solo `SELECT` de formularios que le apliquen vía `form_assignments` y estén `status = 'published'`
- `form_assignments`: admin CRUD total; participante solo lectura de las que le correspondan
- `form_responses`, `answers`: participante solo puede leer/escribir las propias (`participant_id = auth.uid()`); admin lee todas

---

## 8. Convenciones de código

- Naming de archivos: `PascalCase.tsx` para componentes, `camelCase.ts` para use cases/services/utils
- Un caso de uso por archivo, nombrado como verbo+sustantivo (`CreateForm.ts`, no `FormService.ts` genérico dentro de `application/`)
- Ningún componente de `presentation/` importa nada de `infrastructure/` ni de `application/` directamente — solo consume `presentation/services/*`
- Ninguna ruta de `app/api/*` importa nada de `infrastructure/` sin pasar por un caso de uso de `application/`
- Los átomos no reciben props de negocio (`isRequired`, `questionType`) — esas decisiones viven en moléculas/organismos, los átomos solo reciben props visuales
- Prohibido: `createAdminClient()` (service role key) en cualquier ruta o caso de uso que sirva al participante — solo permitido en operaciones estrictamente administrativas server-side

---

## 9. Fases de desarrollo

| Fase | Entregable |
|---|---|
| **0 · Fundación** | Setup Next.js + Styled Components + theme registry + esqueleto Clean Architecture + capa de servicios (axios + interceptors) + Supabase (tablas base `users`/`cohorts`) + RLS baseline + Auth completa (login, logout, refresh, recuperar contraseña, invitación, autoregistro) |
| **1 · Form Builder** | CRUD `Form`/`Question`, drag & drop, panel lateral, tipos de pregunta, `FormSkill` + mapeo, vista previa, duplicar, bloqueo por respuestas existentes |
| **2 · Flujo de respuesta** | Resolución de `FormAssignment`, navegación lineal, timers + autoenvío, autoguardado, `QuestionRenderer` visual |
| **3 · Dashboards** | Stats por cohorte por formulario, vista individual, radar de habilidades |
| **4 · Pulido** | Casos borde, QA, ajustes visuales finales |
