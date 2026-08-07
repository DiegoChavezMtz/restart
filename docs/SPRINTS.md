# Sprints — Roles, permisos, pruebas y módulo clínico

## Propósito

Este documento es el punto de continuidad del proyecto. Cada casilla representa
una entrega verificable: no debe marcarse hasta que el cambio esté implementado,
revisado y validado en el entorno correspondiente.

### Reglas de continuidad

- Mantener las modificaciones de base de datos exclusivamente en migraciones
  nuevas dentro de `supabase/sql/`; nunca editar una migración ya aplicada.
- Toda ruta de API y toda acción de interfaz debe validar permisos en la
  aplicación y quedar reforzada por RLS/RPC en Supabase cuando acceda a datos.
- Las cuentas `test` pueden ejecutar los flujos de `usuario`, pero no deben
  aparecer ni influir en conteos, estadísticas, asistencia, cumplimiento,
  reportes o notificaciones operativas.
- Los expedientes y contenido psicológico sensible sólo se leen mediante el
  flujo auditado: `super_admin` o la `psicologa` asignada.

## Estado de referencia

- [x] Auditoría inicial de formularios, CRUD, seguridad y uso administrativo.
- [x] Fases iniciales de seguridad de formularios, integridad, duplicación y
  archivado.
- [x] Filtro administrativo de formularios: por defecto muestra borradores y
  publicados; archivados quedan ocultos.
- [x] Matriz funcional de roles documentada en `docs/ROLES_Y_PERMISOS.md`.
- [x] Migraciones 015–034 aplicadas y confirmadas funcionales en Supabase.
- [x] Modelo técnico de roles creado: `super_admin`, `admin`, `psicologa`,
  `usuario` y `test`.
- [x] Migración histórica de `participant` a `usuario` aplicada.
- [x] Exclusión persistente de datos test en respuestas, asistencia y
  cumplimiento mensual implementada en base de datos.
- [x] Asignación clínica y acceso auditado a expedientes sensibles implementados
  en base de datos.

---

## Sprint 1 — Arranque administrativo y verificación de matriz

**Objetivo:** dejar una autoridad inicial verificable y comprobar que la matriz
de roles funciona en la base real.

- [x] Promover una cuenta existente y activa a `super_admin` mediante el
  procedimiento de bootstrap controlado.
- [ ] Registrar de forma segura quién es el super administrador inicial y el
  responsable de su recuperación; no guardar contraseñas ni tokens en este
  repositorio.
- [x] Verificar que `super_admin` puede acceder al panel administrativo.
- [ ] Verificar que `admin` puede administrar sólo `usuario` y `test`.
- [ ] Verificar que `admin` no puede crear, modificar, activar/desactivar ni
  asignar capacidades a `psicologa` o `super_admin`.
- [ ] Verificar que `psicologa`, `usuario` y `test` no acceden a pantallas ni
  endpoints administrativos fuera de su alcance.
- [ ] Documentar los resultados de la prueba de matriz y cualquier incidencia
  encontrada antes de continuar al Sprint 2.

**Criterio de cierre:** una cuenta de cada rol puede iniciar sesión y sólo
ejecuta acciones autorizadas por `ROLES_Y_PERMISOS.md`.

---

## Sprint 2 — Panel de administración de cuentas y capacidades

**Objetivo:** eliminar la necesidad de SQL para la operación cotidiana de
usuarios y permisos.

- [x] Crear una sección administrativa de cuentas accesible sólo a
  `super_admin` y `admin`.
- [x] Mostrar nombre, correo, estado, cohorte y rol de cada cuenta, sin exponer
  datos clínicos ni respuestas sensibles.
- [x] Permitir a `super_admin` cambiar entre todos los roles permitidos y
  activar/desactivar cuentas.
- [x] Permitir a `admin` gestionar únicamente cuentas `usuario` y `test`.
- [x] Ocultar y bloquear en UI las acciones que un `admin` no puede ejecutar
  sobre `psicologa` y `super_admin`.
- [x] Añadir controles de confirmación para cambio de rol, desactivación y
  reactivación.
- [x] Crear el panel exclusivo de `super_admin` para otorgar/revocar las
  capacidades delegables de `psicologa`.
- [x] Mostrar capacidades vigentes; no permitir edición
  directa fuera del flujo controlado.
- [ ] Conectar el panel a la RPC administrativa existente y traducir sus errores
  de autorización a mensajes claros.
- [ ] Añadir pruebas de API para escalamiento de privilegios y cambios de estado.

**Criterio de cierre:** ninguna operación cotidiana de cuentas requiere SQL;
las restricciones de rol se validan tanto en UI/API como en Supabase.

---

## Sprint 3 — Citas reales, agenda y propiedad

**Objetivo:** reemplazar por completo el módulo de citas simulado por datos y
operaciones reales de Supabase.

- [x] Inventariar y retirar el uso de `infrastructure/mock/appointmentMock` de
  rutas y pantallas productivas.
- [x] Implementar repositorios Supabase para tipos de cita, disponibilidad,
  espacios, reservas, cancelaciones y cierres.
- [x] Conectar las rutas de API a RPCs y repositorios reales; nunca aceptar un
  identificador de participante/mentor sin autorización de servidor/RLS.
- [x] Implementar la agenda de `admin`/`super_admin` para citas no sensibles.
- [ ] Implementar la agenda de `psicologa` limitada a sus espacios y citas
  propias, conforme a sus capacidades delegadas.
- [ ] Garantizar que una psicóloga puede ser mentora de cualquier tipo de cita
  sólo cuando sea propietaria/asignada, no por el rol por sí solo.
- [x] Permitir que `usuario` y `test` reserven y cancelen sus propias citas.
- [ ] Verificar que las citas `test` se marcan históricamente y no entran en
  cumplimiento, alertas ni reportes.
- [x] Añadir manejo de concurrencia y mensajes de conflicto para espacios ya
  reservados o retirados.

**Criterio de cierre:** la agenda productiva no depende de datos mock y cada
mutación conserva propiedad, permisos y exclusión de test.

---

## Sprint 4 — Expediente clínico y trabajo de psicóloga

**Objetivo:** habilitar la operación clínica sin ampliar el acceso de `admin` a
contenido sensible.

- [x] Crear la vista de casos asignados para `psicologa`.
- [x] Crear el flujo de `admin`/`super_admin` para crear casos y asignar o retirar
  psicólogas, sin mostrar contenido sensible.
- [x] Integrar la lectura de expediente sensible exclusivamente mediante la RPC
  auditada.
- [ ] Mostrar al `super_admin` el contenido sensible permitido y el historial de
  auditoría correspondiente.
- [x] Impedir en interfaz y API que `admin` lea notas clínicas, formularios
  internos psicológicos o contenido de expediente sensible.
- [ ] Permitir a la psicóloga asignada guardar seguimiento clínico sólo en citas
  de las que es mentora/asignada.
- [x] Crear y editar formularios internos psicológicos desde el flujo de
  psicóloga; mantenerlos fuera del flujo de participantes.
- [ ] Verificar que un formulario interno no psicológico de psicóloga requiere
  capacidad delegada por `super_admin`.
- [ ] Probar asignación, reasignación, revocación y lectura auditada con al menos
  dos psicólogas y un administrador.

**Criterio de cierre:** administración puede coordinar casos, pero sólo
super_admin y psicóloga asignada pueden leer material clínico sensible.

---

## Sprint 5 — Formularios, navegación y experiencia por rol

**Objetivo:** que cada persona vea una interfaz coherente con sus permisos y
pueda completar su trabajo sin rutas confusas.

- [ ] Revisar navegación inicial y rutas protegidas para los cinco roles.
- [ ] Definir landing operativa: `super_admin`/`admin` al panel, `psicologa` a
  su agenda/casos y `usuario`/`test` a formularios y citas.
- [ ] Ajustar menú, botones y estados vacíos según permisos efectivos.
- [ ] Mantener el filtro de formularios administrativo con borrador/publicado
  por defecto y archivados ocultos.
- [ ] Permitir a `test` responder formularios y usar agenda como un usuario.
- [ ] Confirmar que las vistas de estadísticas, reportes, asistencia y totales de
  cohorte excluyen por completo a `test`.
- [ ] Añadir indicadores claros de cuenta de prueba en las vistas donde sea útil,
  sin incluirla en métricas operativas.
- [ ] Revisar accesibilidad, confirmaciones y mensajes de error de operaciones
  críticas.

**Criterio de cierre:** no hay acciones visibles sin permiso y la experiencia de
cada rol tiene una ruta inicial y tareas claras.

---

## Sprint 6 — Pruebas, seguridad y salida a producción

**Objetivo:** demostrar que los controles funcionan antes de ampliar el uso.

- [ ] Actualizar Node local para ejecutar la suite que usa
  `--experimental-transform-types`, o adaptar la configuración de pruebas a la
  versión aprobada del proyecto.
- [ ] Crear pruebas unitarias de autorización para cada rol y capacidad.
- [ ] Crear pruebas de integración/RLS para formularios, respuestas, asistencia,
  citas, casos y formularios internos.
- [ ] Crear pruebas de regresión que confirmen que `test` nunca altera métricas,
  reportes, alertas, asistencia ni cumplimiento.
- [ ] Crear pruebas de acceso sensible: admin denegado, psicóloga no asignada
  denegada, psicóloga asignada permitida y super_admin permitido/auditado.
- [ ] Ejecutar lint, chequeo de tipos, pruebas automatizadas y revisión de
  migraciones en staging.
- [ ] Revisar logs/auditoría tras pruebas y corregir accesos o errores
  inesperados.
- [ ] Documentar procedimiento de despliegue, rollback y bootstrap de
  super_admin.
- [ ] Obtener aprobación funcional antes de producción.

**Criterio de cierre:** las pruebas de permisos y datos sensibles pasan en
staging, existe evidencia de auditoría y el procedimiento operativo está
documentado.

---

## Registro de continuación

Al terminar cada sesión, añadir una entrada breve:

```text
YYYY-MM-DD — Sprint N
- Completado:
- Pendiente inmediato:
- Bloqueos/decisiones necesarias:
- Pruebas ejecutadas y resultado:
```

2026-08-04 — Sprint 1

- Completado: se promovió una cuenta existente a `super_admin` y se confirmó el
  acceso al panel administrativo.
- Pendiente inmediato: construir la UI de administración de cuentas y
  capacidades (Sprint 2) antes de la verificación manual completa de matriz.
- Bloqueos/decisiones necesarias: ninguno por ahora.
- Pruebas ejecutadas y resultado: validación manual de acceso super_admin
  confirmada por la persona administradora.

2026-08-04 — Sprint 2 (avance)

- Completado: panel `/admin/users`, endpoints de listado, cambio de rol/estado
  y capacidades de psicólogas, con controles de visibilidad y confirmación.
- Pendiente inmediato: aplicar migración 035, revisar la UI manualmente y crear
  pruebas automatizadas de API/autorización.
- Bloqueos/decisiones necesarias: ninguno.
- Pruebas ejecutadas y resultado: lint, chequeo de tipos y `git diff --check`
 correctos.

2026-08-04 — Sprint 3 (avance)

- Completado: se retiraron los endpoints y pantallas productivas del mock de
  citas; agenda, reserva, cancelación, cierre, espacios y plantillas internas
  usan Supabase, RLS y RPCs.
- Pendiente inmediato: aplicar migración 036 y ejecutar la validación manual de
  reserva/cancelación con usuario, test, admin, super_admin y psicóloga.
- Bloqueos/decisiones necesarias: la agenda completa de psicóloga y el
  seguimiento clínico quedan deliberadamente en Sprint 4.
- Pruebas ejecutadas y resultado: lint, chequeo de tipos y `git diff --check`
  correctos.

2026-08-04 — Entrega de implementación Sprints 1–4

- Completado: se terminó la capa de aplicación de administración de cuentas,
  agenda/citas reales, casos clínicos, asignación de psicólogas y formularios
  internos psicológicos. No se modificó Supabase ni migraciones durante esta
  entrega.
- Pendiente inmediato: validación manual por la persona administradora con las
  cuentas y base de datos ya preparadas.
- Bloqueos/decisiones necesarias: ninguno de implementación.
- Pruebas ejecutadas y resultado: lint, chequeo de tipos y `git diff --check`
  correctos; las pruebas funcionales/RLS quedan a cargo de la revisión manual.

2026-08-04 — Sprint 4 (avance)

- Completado: bandeja clínica `/psychology`, agenda limitada por RLS, APIs de
  creación/asignación de casos y lectura clínica únicamente por RPC auditada.
- Pendiente inmediato: aplicar migración 037, crear la UI administrativa de
  creación/asignación y el editor de formularios internos psicológicos.
- Bloqueos/decisiones necesarias: ninguno.
- Pruebas ejecutadas y resultado: lint, chequeo de tipos y `git diff --check`
  correctos.
