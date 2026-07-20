-- Idempotent: safe to re-run.

-- Popup de instrucciones opcional, configurado por el admin por formulario.
-- Texto libre (nullable); si está vacío/null, el flujo de respuesta no
-- muestra ningún popup y se comporta como antes.
alter table public.forms
  add column if not exists instructions_popup text;
