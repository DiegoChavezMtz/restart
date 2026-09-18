# Módulo de Insignias Digitales (Badges) — Fuente de verdad

> Convenciones heredadas del resto del proyecto — ver `docs/FOUNDATION.md`. Mismo Clean Architecture (`domain` → `application` → `infrastructure` → `presentation`), mismo patrón de migraciones SQL idempotentes en `supabase/sql/`.

## 1. Resumen y alcance (Fase 1 — Taller de CV JCF)

Sistema propio de credenciales digitales verificables, inspirado en **Open Badges 3.0** (1EdTech). Sin servicios externos (Credly/Badgr): vive completamente dentro de Restart, bajo `/badges/*`, reutilizando auth/roles/DB existentes.

MVP: 1 issuer (JCF/Restart, seedeado), badge_classes creadas por admin (con imagen SVG/PNG), otorgamiento por cohorte (sin escribir emails), página de verificación pública, JSON Open Badges 3.0, "Mis insignias" en el espacio del participante con enlace a LinkedIn.

Fuera de alcance por ahora: catálogo público completo, múltiples issuers, historial de revocación, expiración activa (el campo `valid_months` existe pero no hay lógica de vencimiento automático todavía), carga masiva por CSV.

## 2. Modelo de datos (`supabase/sql/048_badges.sql`)

- `badge_issuers` — emisor (nombre, url, email, imagen).
- `badge_classes` — definición de una insignia (nombre, descripción, criterios, imagen, issuer_id, valid_months, is_active).
- `badge_assertions` — otorgamiento a un `public.users.id` (recipient_id), con estado `active`/`revoked`, `unique(badge_class_id, recipient_id)`.
- Función `SECURITY DEFINER` `get_public_badge_assertion(uuid)` — único punto de acceso público (grant a `anon`) a los datos de una assertion; no expone email ni cohort_id del participante, solo `full_name`.
- Bucket de Storage `badge-images` (público, `image/svg+xml` + `image/png`, máx. 1 MB, escritura solo admin).
- RLS: lectura de issuers/classes abierta a todos; escritura solo `public.is_admin()`; assertions visibles por el dueño (`recipient_id = auth.uid()`) o por admin.

## 3. Rutas

- `/admin/badges` — listado de badge_classes.
- `/admin/badges/classes/new` — alta con carga de imagen.
- `/admin/badges/assign?badgeClassId=&cohortId=` — elegir insignia + cohorte, otorgar/revocar por clic (o "otorgar a todos los pendientes"), sin escribir email.
- `/badges` — "Mis insignias" del participante logueado (protegida con `RequireAuth`; sin `layout.tsx` compartido con `/badges/verify` para no gatearla).
- `/badges/verify/[id]` — página pública (Server Component), sin login, con `<script type="application/ld+json">` embebido.
- `/api/badges/verify/[id]/credential.json` — mismo JSON Open Badges 3.0 crudo, para LinkedIn/terceros.

## 4. Decisiones tomadas

- Sin firma criptográfica (`proof`) en el JSON — MVP se apoya en servirse desde el dominio propio del issuer.
- Un solo issuer en esta fase: `CreateBadgeClass` lo resuelve automáticamente (no hay selector en el form).
- Otorgamiento exclusivamente por cohorte (lista cerrada de `public.users.cohort_id`), no por email suelto ni CSV.
- Imagen de badge servida por URL pública de Storage (no SVG inline en la columna) para que LinkedIn y el JSON puedan referenciarla directo.
