-- ===========================================================================
-- 0004 — Widen the quote status lifecycle
--
-- Adds `ready` and `archived` to the allowed quote statuses. The original
-- constraint in 0001 was an inline unnamed CHECK, which Postgres names
-- `quotes_status_check`. We drop it (if present, by either the conventional
-- name) and re-add a named constraint covering the full lifecycle:
--   draft -> ready -> sent -> accepted | rejected ; any -> archived ; restore -> draft
--
-- Transition *rules* are enforced in the application (src/lib/quotes/status.ts +
-- updateQuoteStatus); this constraint just bounds the set of legal values.
-- Safe to run multiple times.
-- ===========================================================================

alter table public.quotes
  drop constraint if exists quotes_status_check;

alter table public.quotes
  add constraint quotes_status_check
  check (status in ('draft', 'ready', 'sent', 'accepted', 'rejected', 'archived'));
