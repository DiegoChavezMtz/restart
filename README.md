# Restart

Sistema interno de Dekids para crear y asignar formularios de evaluación, responderlos por cohorte y consultar estadísticas y perfiles de habilidades.

## Requisitos

- Node.js 22 o superior
- Un proyecto de Supabase
- Variables de `.env.local.example` configuradas en `.env.local`
- Scripts de `supabase/sql/001_extensions.sql` a `023_appointment_scheduling_jobs.sql` aplicados en orden

La configuración detallada de Supabase está en `docs/SUPABASE_SETUP.md`.

## Desarrollo

```bash
npm install
npm run dev
```

La aplicación queda disponible en `http://localhost:3000`.

## Verificación

```bash
npm test
npm run typecheck:auth
npm run lint
npm run build
```

`npm test` ejecuta las pruebas del contrato, casos de uso, política de refresh y endurecimiento SQL de autenticación.

## Autenticación

- El access token se conserva solamente en memoria.
- El refresh token se guarda en una cookie `httpOnly`, `SameSite=Lax` y segura en producción.
- Un `401` inicia un único refresh compartido y reintenta la solicitud original.
- El registro requiere una invitación activa.
- La base deriva la cohorte desde el token y fuerza el rol `participant`; no confía en metadata de rol o cohorte enviada por el cliente.
- El primer administrador se crea mediante el procedimiento SQL de bootstrap documentado en `docs/SUPABASE_SETUP.md`.

Después de modificar autenticación, aplica y verifica especialmente `supabase/sql/013_auth_hardening.sql` en el proyecto Supabase correspondiente.

## Arquitectura

El código está separado en cuatro capas:

- `src/domain`: entidades, contratos y validaciones puras.
- `src/application`: casos de uso y reglas de negocio.
- `src/infrastructure`: implementaciones de Supabase.
- `src/presentation` y `src/app`: UI, estado, servicios HTTP y rutas Next.js.

La documentación arquitectónica completa está en `docs/CONSTITUCION.md`.
