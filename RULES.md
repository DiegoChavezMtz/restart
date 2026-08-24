# RULES.md — protocolo de trabajo para cualquier agente que codifique en este repo

Este archivo aplica a cualquier agente de código (Codex, Claude Code, o el que sea) que
trabaje directamente en este repositorio. Antes de escribir una sola línea, lee
`ARCHITECTURE.md` — ahí están las reglas de cómo se construye este sistema. Este archivo,
en cambio, define *cómo te comportas* con el flujo de trabajo y con Trello, no cómo se
construye el código.

## Board de Trello de este proyecto

- Board: **Dekids Proyectos**
- Label: **Restart Webapp** — toda tarjeta que toques debe tener este label. Si ves una
  tarjeta sin este label o con el de otro proyecto, no es tuya, ignórala.
- Listas relevantes: `Hielera` (trabajo listo para tomar), `Por Corregir` (trabajo devuelto
  por Diego), `Haciendo` (en lo que estás trabajando), `En revisión` (terminado, esperando a
  Diego), `Hecho`.

## Regla maestra: nunca avanzas solo

Terminaste una tarjeta → la mueves a `En revisión` → **te detienes ahí**. No tomas otra
tarjeta, no sigues con nada, hasta que Diego te lo pida explícitamente (un mensaje tipo
"continúa", "sigue con la siguiente", o pidiéndote una tarea específica). Esto aplica
siempre, sin excepción.

## Cuando Diego dice "continúa" (sin especificar qué)

Revisa el estado real del tablero, en este orden, y actúa según el primero que aplique:

1. **¿Tengo una tarjeta en `Por Corregir`?** Trabájala primero. No tomes nada del Hielera
   mientras tengas algo pendiente de corregir.
2. **¿Tengo una tarjeta en `En revisión` con la palomita verde marcada (`dueComplete`)?**
   Eso significa que Diego ya la aprobó. Muévela a `Hecho`, agrega una entrada corta en
   `ESTADO_ACTUAL.md` describiendo qué se implementó, y toma la siguiente tarjeta del
   Hielera.
3. **¿Tengo una tarjeta en `En revisión` sin la palomita?** Diego todavía no la ha
   revisado. No asumas que puedes seguir — dile explícitamente: *"Mi última tarjeta
   [nombre] sigue en revisión sin aprobar. ¿La considero bloqueante o tomo otra del Hielera
   mientras tanto?"* y espera su respuesta antes de actuar.
4. **Si no tengo nada pendiente en ninguna de las anteriores** → toma una tarjeta nueva del
   Hielera.

## Cuando Diego pide una tarea específica

Antes de ejecutarla, revisa el tablero: ¿ya existe una tarjeta con este mismo alcance? ¿esta
tarea choca con algo que ya está en `Haciendo` o `En revisión`? ¿contradice una regla ya
establecida en `ARCHITECTURE.md`? Si encuentras fricción, señálasela a Diego antes de
empezar — no la ejecutes ciego solo porque te lo pidió.

## Al terminar una tarjeta

1. Mueve la tarjeta a `En revisión`.
2. Deja un comentario corto en la tarjeta resumiendo qué hiciste y qué archivos tocaste.
3. Detente ahí (ver Regla maestra).

## Al aprobarse una tarjeta (palomita verde puesta por Diego)

1. Mueve la tarjeta a `Hecho`.
2. Agrega una entrada en `ESTADO_ACTUAL.md` con la fecha y una descripción breve de lo que
   quedó implementado — este es el único momento en que se actualiza ese archivo.
3. Toma la siguiente tarjeta según la lógica de arriba.

## Restricciones

- Nunca te muevas a `Hecho` sin la palomita verde puesta por Diego — tú no apruebas tu
  propio trabajo.
- Nunca muevas ni edites tarjetas de otro proyecto (otro label, u otro board).
- Nunca edites `ARCHITECTURE.md` para que refleje lo que planeas hacer — ese archivo
  describe reglas vigentes, no intenciones. Si tu trabajo cambia una regla técnica
  existente, avísale a Diego para que él decida si se actualiza.
- Si algo en una tarjeta es ambiguo (criterio de aceptación poco claro, alcance
  indefinido), pregúntale a Diego antes de interpretar por tu cuenta.
