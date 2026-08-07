# Roles y permisos

Esta matriz es la fuente de verdad funcional para la autorización de Restart.
El rol define el acceso base; una capacidad delegada sólo amplía actividades no
clínicas de una `psicologa` y únicamente un `super_admin` puede otorgarla o
revocarla.

| Rol | Acceso base |
| --- | --- |
| `super_admin` | Administración completa, todos los usuarios, configuración, analítica, auditoría y lectura de expedientes sensibles. |
| `admin` | Usuarios/test, cohortes, invitaciones, formularios, asistencia, analítica, reportes y citas no sensibles. Asigna psicólogas a casos, sin leer su contenido sensible. |
| `psicologa` | Citas propias o asignadas de cualquier tipo y expedientes sensibles que tenga asignados. Puede crear formularios internos. |
| `usuario` | Formularios y citas propias; sus datos cuentan en operación y analítica. |
| `test` | Misma experiencia que `usuario`, pero sus datos no cuentan en métricas, reportes, asistencia, cumplimiento ni alertas. |

## Capacidades delegables

Sólo se delegan a una `psicologa` y sólo por `super_admin`:

- `manage_appointment_availability`
- `manage_non_sensitive_appointments`
- `manage_non_sensitive_internal_forms`

Una capacidad nunca otorga acceso a expedientes sensibles ajenos: ese acceso
depende exclusivamente de ser `super_admin` o de la asignación explícita del
caso.

## Reglas de expedientes

- `super_admin` puede leer cualquier expediente sensible; el acceso queda
  auditado.
- `psicologa` sólo puede leer o editar un expediente sensible si está asignada.
- `admin` puede crear y asignar casos, pero no leer contenido sensible.
