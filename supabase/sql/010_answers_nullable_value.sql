-- Idempotent: safe to re-run.

-- Auto-submit-by-timeout can advance a question with no answer selected
-- (docs/CONSTITUCION.md rule 4: "al agotarse timeLimitSeconds ... avanza"),
-- which is stored as value = null. Manual submits still always require a
-- real value (enforced in the application layer, not by a DB constraint).
alter table public.answers alter column value drop not null;
