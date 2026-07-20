# Guía de configuración de Supabase — Restart

Este documento es un checklist paso a paso para dejar un proyecto Supabase real conectado a Restart y probar el flujo de Auth de punta a punta. Todo lo aquí descrito se hace **manualmente en el dashboard de [supabase.com](https://supabase.com)** — no hay CLI ni migraciones automatizadas en este proyecto (ver `docs/CONSTITUCION.md` sección 2). El código ya está implementado y verificado (`tsc`/`lint`/`build` limpios); lo que falta es exclusivamente esta configuración externa.

---

## 1. Crear el proyecto Supabase

1. Entra a [supabase.com](https://supabase.com) e inicia sesión (o crea una cuenta).
2. **New project** → elige tu organización.
3. Completa:
   - **Name**: por ejemplo `restart-dekids` (o `restart-dekids-dev` si vas a tener un proyecto separado para producción más adelante).
   - **Database Password**: genera una segura y guárdala en un gestor de contraseñas — la necesitarás si algún día te conectas directo a Postgres (psql, herramientas de admin), aunque el flujo normal de la app no la usa.
   - **Region**: la más cercana a tus usuarios (por ejemplo, la región de US o South America más cercana).
4. Click **Create new project**. El aprovisionamiento tarda entre 1 y 2 minutos.

---

## 2. Obtener las credenciales de API

1. Dentro del proyecto: **Project Settings** (ícono de engranaje) → **API**.
2. Copia estos tres valores:
   - **Project URL** (ej. `https://xxxxxxxxxxxx.supabase.co`)
   - **anon public** key (una key larga tipo JWT, bajo "Project API keys")
   - **service_role** key (otra key JWT, marcada como secreta)

> **Advertencia:** la `service_role` key **bypasea RLS por completo**. Nunca la pegues en código de cliente, nunca la subas a git, nunca la compartas fuera de `.env.local`/las variables de entorno del hosting. En el código de Restart, solo `createAdminSupabaseClient()` (`src/infrastructure/supabase/client.ts`) la usa, y solo para operaciones estrictamente administrativas server-side (regla 11 de `docs/CONSTITUCION.md`) — ningún caso de uso de este milestone de Auth la utiliza.

---

## 3. Configurar `.env.local`

1. En la raíz del repo, copia el archivo de ejemplo:
   ```bash
   cp .env.local.example .env.local
   ```
2. Abre `.env.local` y llena las tres variables con los valores del paso 2:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
   SUPABASE_SERVICE_ROLE_KEY=eyJ...
   ```
3. Confirma que `.env.local` **no** se suba a git — el `.gitignore` del proyecto ya excluye `.env*` con una excepción explícita solo para `.env.local.example`.
4. Reinicia el dev server si ya lo tenías corriendo (`npm run dev`), para que Next.js recargue las variables de entorno.

---

## 4. Correr los scripts SQL, en orden

Ve a **SQL Editor** (ícono de terminal en el menú lateral) → **New query**. Pega el contenido completo de cada archivo y ejecútalo (▶ Run), **uno a la vez, en este orden exacto**:

| # | Archivo | Qué hace |
|---|---|---|
| 1 | `supabase/sql/001_extensions.sql` | Habilita la extensión `pgcrypto` (necesaria para generar UUIDs). |
| 2 | `supabase/sql/002_users_and_cohorts.sql` | Crea las tablas `cohorts` y `users` (perfil de la app, FK a `auth.users`), habilita RLS en ambas. |
| 3 | `supabase/sql/003_rls_baseline.sql` | Crea la función `is_admin()` y las policies base de `users`/`cohorts` (admin acceso total, usuario lee/actualiza su propia fila). |
| 4 | `supabase/sql/004_invitations.sql` | Crea la tabla `invitations`, su policy admin-only, y la función `get_invitation_by_token` (usada para validar un token de invitación antes de que el participante tenga sesión). |
| 5 | `supabase/sql/005_registration.sql` | Crea el trigger seguro `handle_new_user`, que crea el perfil únicamente cuando el alta incluye una invitación activa. |
| 6–12 | `supabase/sql/006_*.sql` … `012_*.sql` | Crea formularios, habilidades, asignaciones, respuestas, branching e instrucciones. |
| 13 | `supabase/sql/013_auth_hardening.sql` | Obliga a derivar la cohorte desde una invitación activa, fija el rol de registro en `participant` y bloquea cambios propios de rol/cohorte. Es obligatorio también en instalaciones existentes. |

Todos son **idempotentes** — puedes volver a correr cualquiera sin romper nada (usan `if not exists` / `drop policy if exists` antes de recrear). Si algo falla a mitad de camino, corrige el error y vuelve a correr el mismo script completo.

---

## 5. Configurar Redirect URLs (necesario para el reset de contraseña)

1. **Authentication** → **URL Configuration**.
2. En **Redirect URLs**, agrega:
   ```
   http://localhost:3000/reset-password
   ```
3. Cuando despliegues a producción, agrega también `https://tu-dominio.com/reset-password` (puedes tener varias URLs en la lista a la vez).

Sin este paso, Supabase rechaza el `redirectTo` que manda `requestPasswordReset` (`src/app/api/auth/forgot-password/route.ts`) y el link de recuperación no se genera correctamente.

---

## 6. Customizar el template de email "Reset Password"

Por defecto, Supabase arma el link de recuperación con un fragment (`#access_token=...`), que nunca llega al servidor y obliga a parsear en el cliente de forma frágil. Restart está diseñado para usar en su lugar un query param server-visible (`token_hash`), consumido por `SupabaseAuthRepository.resetPassword()` vía `client.auth.verifyOtp({ token_hash, type: "recovery" })`.

1. **Authentication** → **Email Templates** → selecciona **Reset Password**.
2. Busca el link del template (por defecto algo como `<a href="{{ .ConfirmationURL }}">Reset Password</a>`).
3. Reemplázalo por:
   ```
   {{ .SiteURL }}/reset-password?token_hash={{ .TokenHash }}&type=recovery
   ```
4. Guarda los cambios.

---

## 7. Desactivar "Confirm email" (obligatorio)

El registro en Restart es siempre vía invitación (link generado por un admin, `RegisterViaInvitation`) — nadie llega a `/register` sin ese link, así que la invitación ya cumple el rol de verificación. Por diseño, el flujo debe quedar sin fricción: el participante llena el form y entra directo, sin pantalla intermedia de "revisa tu correo".

1. **Authentication** → **Providers** → **Email**.
2. Desactiva el toggle **Confirm email**.

Esto **no es opcional**: `SupabaseAuthRepository.registerViaInvitation()` (`src/infrastructure/supabase/auth/SupabaseAuthRepository.ts`) espera que `client.auth.signUp()` devuelva una sesión inmediatamente. Si "Confirm email" queda activado, `signUp()` no devuelve sesión y el registro falla con un error 500 ("No se pudo iniciar sesión automáticamente…") en vez de loguear al participante.

---

## 8. Crear el primer usuario admin (problema huevo-y-gallina)

El único camino de registro del código es `RegisterViaInvitation`, que requiere un token de invitación — y generar una invitación (`POST /api/invitations`) requiere ya ser admin. Para romper el círculo, el primer admin se crea directo desde el dashboard:

1. **Authentication** → **Users** → **Add user** → **Create new user**.
2. Ingresa el email y una contraseña (o marca "Auto Confirm User" si no quieres que pida confirmación para este usuario).
3. Esto crea una fila en `auth.users`. Al no existir una invitación, el trigger endurecido no crea un perfil público automáticamente.
4. Ve a **SQL Editor** y crea explícitamente el perfil administrativo:
   ```sql
   insert into public.users (id, email, full_name, role, cohort_id)
   select id, email, 'Administrador', 'admin', null
   from auth.users
   where email = 'tu-email@ejemplo.com'
   on conflict (id) do update
     set role = 'admin', email = excluded.email, full_name = excluded.full_name;
   ```
5. Confirma en **Table Editor → users** que la fila tiene `role = admin`.

---

## 9. Crear al menos un cohort

Todavía no existe una UI de administración de Cohortes (es un milestone futuro, ver `docs/CONSTITUCION.md` sección 6.2), así que se crea directo en la base:

- **Table Editor** → tabla `cohorts` → **Insert row** → llena `name` (ej. "Cohorte 2026-1") y opcionalmente `description`. Guarda y copia el `id` (uuid) generado — lo necesitarás en el siguiente paso.

O equivalentemente por SQL Editor:
```sql
insert into public.cohorts (name, description) values ('Cohorte 2026-1', 'Primera cohorte de prueba') returning id;
```

---

## 10. Probar el flujo completo end-to-end

Con el dev server corriendo (`npm run dev`, en `http://localhost:3000`):

1. **Login como admin**: ve a `http://localhost:3000/login`, ingresa el email/contraseña del admin creado en el paso 8. Deberías ser redirigido a `/admin`.

2. **Obtener un `accessToken`** para generar la invitación. La forma más simple es abrir las DevTools del navegador (pestaña Network) después de hacer login y copiar el `accessToken` de la respuesta de `POST /api/auth/login`. Con ese token:
   ```bash
   curl -X POST http://localhost:3000/api/invitations \
     -H "Authorization: Bearer PEGA_AQUI_EL_ACCESS_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"cohortId": "PEGA_AQUI_EL_UUID_DEL_COHORT"}'
   ```
   La respuesta trae el objeto `Invitation` completo, incluyendo `token`.

3. **Registrar un participante**: visita `http://localhost:3000/register?token=EL_TOKEN_DE_ARRIBA`. Completa nombre/correo/contraseña y envía. Con "Confirm email" desactivado (paso 7), deberías terminar logueado automáticamente en `/respond`, sin pantalla intermedia.

4. **Verificar el perfil creado**: en **Table Editor → users**, confirma que la fila nueva tiene el `cohort_id` correcto y `role = 'participant'`.

5. **Verificar el refresh silencioso**: recarga la página `/` (F5). Deberías seguir viendo la sesión iniciada sin tener que loguear de nuevo — esto confirma que `AuthContext` llamó `POST /api/auth/refresh` al montar y retomó la sesión desde la cookie httpOnly.

6. **Verificar logout**: haz click en "Cerrar sesión". Abre DevTools → **Application** → **Cookies** → `localhost:3000`, y confirma que la cookie `restart_refresh_token` ya no existe (o quedó vacía/expirada).

7. **Probar recuperación de contraseña**:
   - Ve a `/forgot-password`, ingresa el correo del admin (o del participante que registraste).
   - Revisa el correo recibido (o los logs de Supabase si es un correo de prueba) y haz click en el link — debería llevarte a `/reset-password?token_hash=...`.
   - Ingresa una contraseña nueva y confirma que te loguea automáticamente.
   - Haz logout y vuelve a hacer login con la contraseña **nueva** para confirmar que realmente cambió.

---

## 11. Troubleshooting

| Síntoma | Causa probable |
|---|---|
| `401` constante en `POST /api/auth/refresh` incluso justo después de hacer login | La cookie `restart_refresh_token` tiene `path: "/api/auth"` — si estás probando con un cliente HTTP que no envía cookies por dominio/path correctamente (Postman a veces no persiste cookies entre requests), usa el navegador en vez de un cliente HTTP externo para probar el flujo de sesión. |
| `permission denied for table users` (o similar) al hacer login/consultar el perfil | RLS está bloqueando la query — confirma que el script `003_rls_baseline.sql` corrió sin errores y que las policies existen (**Authentication → Policies**, o `select * from pg_policies where tablename = 'users';` en el SQL Editor). |
| El link de "Reset Password" no funciona / lleva a una página de error de Supabase | Falta el paso 5 (Redirect URLs) o el paso 6 (template del email) — revisa ambos. |
| `/register?token=...` muestra "Invitación inválida" con un token que sí generaste | El token pudo haberse desactivado (`PATCH /api/invitations/[token]`), o lo copiaste mal (revisa que no tenga espacios/saltos de línea al pegarlo en la URL). |
| El admin creado manualmente en el paso 8 no puede generar invitaciones (`403 Forbidden`) | Falta crear su perfil en `public.users` con el SQL de bootstrap del paso 8. |
| El trigger `handle_new_user` no creó la fila de un participante en `public.users` | Confirma que `005_registration.sql` y `013_auth_hardening.sql` corrieron sin errores y que el registro recibió un token de invitación activo. Para usuarios sin invitación, no crear perfil es el comportamiento seguro esperado. |
| `POST /api/auth/register` devuelve `500` con "No se pudo iniciar sesión automáticamente…" | "Confirm email" sigue activado (paso 7) — desactívalo en **Authentication → Providers → Email**. |

---

## Referencia rápida de archivos relacionados

- `.env.local.example` — plantilla de variables de entorno (paso 3).
- `supabase/sql/001_extensions.sql` … `013_auth_hardening.sql` — scripts SQL (paso 4).
- `src/infrastructure/supabase/client.ts` — los tres clientes Supabase (browser/server/admin).
- `src/infrastructure/supabase/auth/SupabaseAuthRepository.ts` — implementación de todos los métodos de Auth contra Supabase.
- `docs/CONSTITUCION.md` — fuente de verdad arquitectónica del proyecto.
