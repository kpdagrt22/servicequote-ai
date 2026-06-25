-- ===========================================================================
-- 0005 — Customer-facing quote sharing
--
-- Adds an unguessable share token to quotes so a contractor can send a
-- read-only branded proposal link to a customer, plus columns to record when it
-- was shared and the customer's response (accept / decline) from that page.
--
-- The public proposal page reads by token through the SERVICE-ROLE client
-- (server-side only) — RLS is unchanged and never opened to anon. The token is a
-- random uuid (gen_random_uuid), so links are unguessable; revoke by clearing
-- the column. Safe to run multiple times.
-- ===========================================================================

alter table public.quotes
  add column if not exists share_token            uuid,
  add column if not exists shared_at              timestamptz,
  add column if not exists customer_response       text,
  add column if not exists customer_responded_at   timestamptz,
  add column if not exists customer_view_count     integer not null default 0;

-- Bound the customer_response values.
alter table public.quotes
  drop constraint if exists quotes_customer_response_check;
alter table public.quotes
  add constraint quotes_customer_response_check
  check (customer_response is null or customer_response in ('accepted', 'declined'));

-- One token per quote; fast lookup from the public page.
create unique index if not exists idx_quotes_share_token
  on public.quotes (share_token)
  where share_token is not null;
