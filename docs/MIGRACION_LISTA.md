# Migración pendiente — Módulo de asistencia ("Pase de lista")

Este documento describe **qué hace hoy el módulo de asistencia** (`/admin/attendance`), que corre 100% con datos simulados en el cliente, y **qué se necesita construir** (esquema, endpoints, storage) para que funcione contra datos reales. No hay ningún script SQL aplicado todavía para este módulo — es la siguiente pieza pendiente después de `supabase/sql/013_auth_hardening.sql`.

---

## 1. Estado actual: todo es simulado, nada persiste

El módulo vive en `src/app/admin/attendance/page.tsx` y usa dos piezas de datos reales de Supabase (generaciones y participantes, vía `cohortService`) más **datos 100% simulados en memoria del navegador** para todo lo relacionado con asistencia. Al recargar la página se pierde todo.

| Dato | ¿De dónde sale hoy? | Archivo |
|---|---|---|
| Generaciones (cohortes) | Real — `cohortService.listCohorts()` | `src/presentation/services/cohortService.ts` |
| Participantes de una generación | Real — `cohortService.getCohortDetail(cohortId)` | `src/presentation/services/cohortService.ts` |
| Días/sesiones de asistencia | **Simulado** — últimos 10 días hábiles generados en el cliente en cada carga | `generateAttendanceDays()` en `src/presentation/mocks/attendanceMockData.ts` |
| Estado inicial de asistencia (asistió/retardo/falta) | **Simulado** — hash determinístico de `cohortId:userId:dayId` (≈70% asistió / 20% retardo / 10% falta) | `generateInitialAttendance()` en el mismo archivo |
| Ediciones desde "Pase de lista" | En memoria (`useState` de `AdminAttendancePage`), nunca se envían a ningún lado | `src/app/admin/attendance/page.tsx` |
| Justificaciones (descripción + archivo) | En memoria; el archivo se referencia con un `URL.createObjectURL()` del navegador — **no sale del cliente, no sobrevive a un refresh** | `JustificationModal.tsx`, `attendanceMockData.ts` |
| Estadísticas del concentrado (3 retardos = 1 falta, % asistencia) | Calculadas en el cliente a partir de los datos simulados de arriba | `computeUserAttendanceSummary` / `computeCohortAttendanceSummary` en `attendanceMockData.ts` |

### Flujo actual (UI)

1. **Selector de generación** (`/admin/attendance`) — real, usa las cohortes existentes.
2. **Pase de lista** (`AttendanceRollCall.tsx`) — tabs de días arriba, cards de participantes abajo, 4 botones por participante: **Asistió / Retardo / Falta / Justificar**.
   - Click en Asistió/Retardo/Falta togglea ese estado para ese usuario+día (click de nuevo lo quita).
   - Click en Justificar abre `JustificationModal.tsx`: textarea de descripción + input de archivo (`accept=".pdf,.png,.jpg,.jpeg"`). Al guardar, marca el día como `justificado` y guarda descripción + referencia al archivo.
3. **Concentrado** (`AttendanceSummaryTable.tsx`) — tabla por participante (Asistencias / Retardos / Justificados / Faltas / % Asistencia) + agregado de la generación. Columna "Faltas" tiene tooltip con el desglose (faltas normales vs. faltas por acumulación de retardos). Botón "Ver detalle" abre un modal día por día; los días justificados tienen un botón "Ver justificación" que abre un popup con la causa y la imagen/archivo adjunto.

### Regla de negocio ya implementada (debe sobrevivir a la migración)

**Cada 3 retardos cuentan como 1 falta adicional, solo para las estadísticas del concentrado.** Los retardos crudos nunca se descuentan ni se reetiquetan como falta — es un cálculo derivado en lectura:

```
derivedAbsences  = floor(retardos / 3)
effectiveAbsent  = faltas + derivedAbsences
attendanceRate   = round(((totalDías - effectiveAbsent) / totalDías) * 100)
```

Hoy esto vive como funciones puras en `src/presentation/mocks/attendanceMockData.ts` (`computeUserAttendanceSummary`, `computeCohortAttendanceSummary`, constante `RETARDOS_POR_FALTA = 3`). Al migrar, esta lógica debe moverse tal cual (es pura, sin I/O) a la capa de aplicación (`src/application/use-cases/attendance/`), no reimplementarse.

---

## 2. Esquema de datos necesario

Siguiendo el patrón ya usado en `supabase/sql/` (tablas `snake_case`, PK `uuid default gen_random_uuid()`, RLS obligatorio, policies vía `public.is_admin()`):

### `attendance_sessions` — un "día" de asistencia por generación

```sql
create table if not exists public.attendance_sessions (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid not null references public.cohorts (id) on delete cascade,
  session_date date not null,
  created_by uuid not null references public.users (id),
  created_at timestamptz not null default now(),
  unique (cohort_id, session_date)
);
```

Reemplaza a `generateAttendanceDays()`. Hoy los "días" se autogeneran (últimos 10 hábiles); con datos reales, alguien (el admin) tiene que crear explícitamente cada sesión — ver pregunta abierta en §4.

### `attendance_records` — el estado de un participante en una sesión

```sql
create table if not exists public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.attendance_sessions (id) on delete cascade,
  participant_id uuid not null references public.users (id) on delete cascade,
  status text not null check (status in ('asistio', 'retardo', 'falta', 'justificado')),
  recorded_by uuid not null references public.users (id),
  recorded_at timestamptz not null default now(),
  unique (session_id, participant_id)
);

create index if not exists idx_attendance_records_session_id on public.attendance_records (session_id);
create index if not exists idx_attendance_records_participant_id on public.attendance_records (participant_id);
```

Reemplaza al estado en memoria de `AttendanceRollCall`. Un registro por participante+sesión — exactamente el mismo modelo que ya usa `AttendanceByUserAndDay` en el cliente.

### `attendance_justifications` — causa + archivo, 1:1 con un record `justificado`

```sql
create table if not exists public.attendance_justifications (
  attendance_record_id uuid primary key references public.attendance_records (id) on delete cascade,
  description text not null,
  file_path text,
  file_type text,
  created_at timestamptz not null default now()
);
```

`file_path` es la ruta dentro del bucket de Storage (ver §3), no una URL — las URLs de descarga se firman al vuelo. Reemplaza a `JustificationDetail` (`description`, `fileName`, `fileUrl`, `fileType`) del cliente; `fileUrl` deja de existir como tal porque hoy es un object URL local que no tiene sentido persistir.

### RLS propuesto (mismo patrón que el resto del proyecto)

- Admin: acceso total a las 3 tablas vía `public.is_admin()`.
- Participante: solo `select` de sus propios `attendance_records`/`attendance_justifications` (para un futuro "mi asistencia"), nunca `insert`/`update`/`delete` — solo el admin toma asistencia.

---

## 3. Storage para los archivos de justificación

Hoy el "archivo" nunca sale del navegador (`URL.createObjectURL`). Para persistirlo de verdad hace falta un bucket de **Supabase Storage**:

- Bucket propuesto: `attendance-justifications`, **privado** (no público).
- Tipos permitidos: `application/pdf`, `image/png`, `image/jpeg` (mismo `accept` que ya usa `JustificationModal.tsx`).
- Policy: solo admin puede subir/leer/borrar (vía `public.is_admin()` en la policy de Storage), igual que las tablas de arriba.
- Lectura: URLs firmadas de corta duración (`createSignedUrl`) generadas en el momento de abrir el popup "Ver justificación" — nunca URLs públicas permanentes.

---

## 4. Decisiones abiertas (para definir antes de escribir la migración real)

1. **¿Quién puede tomar asistencia?** Hoy solo existe `admin`/`participant`. ¿Un futuro rol "profesor" necesita poder pasar lista sin ser admin completo?
2. **¿Cómo se crean los días?** Hoy se autogeneran los últimos 10 días hábiles. ¿El admin debe poder agregar/quitar sesiones libremente (botón "+ Agregar día"), o la generación tiene un calendario/horario fijo del que se derivan automáticamente?
3. **¿El archivo es obligatorio en una justificación?** Hoy el modal permite guardar solo con descripción, sin archivo.
4. **Límite de tamaño / cantidad de archivos** por justificación (hoy es 1 archivo, sin límite de tamaño explícito).
5. **¿El participante ve su propio historial de asistencia?** El módulo actual vive bajo `/admin` (`RequireAdmin`); no hay vista de participante todavía.
6. **Retención**: ¿se conservan las justificaciones/archivos indefinidamente o hay que purgarlas después de cierto tiempo?

---

## 5. Mapeo de archivos a actualizar cuando exista el backend

| Archivo | Cambio necesario |
|---|---|
| `src/domain/entities/index.ts` | Agregar `AttendanceSession`, `AttendanceRecord`, `AttendanceJustification`. |
| `src/domain/repositories/index.ts` | Agregar `AttendanceRepository` (listar sesiones, crear sesión, marcar asistencia, justificar). |
| `src/application/use-cases/attendance/*` | Casos de uso nuevos (`RecordAttendance`, `JustifyAttendance`, `RemoveAttendanceJustification`, `ListAttendanceSessions`, `CreateAttendanceSession`) + mover aquí las funciones puras de `computeUserAttendanceSummary`/`computeCohortAttendanceSummary`. |
| `src/infrastructure/supabase/repositories/SupabaseAttendanceRepository.ts` | Nuevo — implementa `AttendanceRepository`, incluye upload/signed URL de Storage. |
| `src/app/api/attendance/**` | Rutas API nuevas (sesiones, records, justificaciones), mismo patrón que `src/app/api/cohorts/`. |
| `src/presentation/services/attendanceService.ts` | Nuevo — reemplaza a `src/presentation/mocks/attendanceMockData.ts` como fuente de datos (las funciones de cálculo puro se re-exportan desde application). |
| `src/app/admin/attendance/page.tsx` | Cambiar `generateAttendanceDays`/`generateInitialAttendance` por fetch real de sesiones + records. |
| `src/presentation/organisms/AttendanceRollCall.tsx` | Los handlers (`onStatusChange`, `onJustify`, `onRemoveJustification`) pasan de mutar estado local a llamar al backend (con actualización optimista). |
| `src/presentation/molecules/JustificationModal.tsx` | El input de archivo sube el `File` real al endpoint en vez de solo crear un object URL. |
| `src/presentation/organisms/AttendanceSummaryTable.tsx` | El popup de justificación pide una signed URL en vez de usar el object URL local. |

Una vez resueltas las decisiones de §4, el siguiente paso es escribir `supabase/sql/014_attendance.sql` con las 3 tablas + RLS + bucket, agregarlo a la tabla de `docs/SUPABASE_SETUP.md` §4, y correrlo manualmente en el SQL Editor del proyecto Supabase — mismo procedimiento que las migraciones 011–013.
