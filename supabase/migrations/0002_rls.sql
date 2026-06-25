-- ===========================================================================
-- ServiceQuote AI — Row Level Security
--
-- Principle: a user can only touch data belonging to an organization they are a
-- member of. Reads require membership (is_org_member); writes to business data
-- require the owner/admin role (is_org_editor). There is no cross-organization
-- access path. Both helper functions are SECURITY DEFINER so policies that
-- reference organization_members do not recurse.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;

create policy "profiles: read own"
  on public.profiles for select
  using (id = auth.uid());

create policy "profiles: insert own"
  on public.profiles for insert
  with check (id = auth.uid());

create policy "profiles: update own"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- ---------------------------------------------------------------------------
-- organizations
-- ---------------------------------------------------------------------------
alter table public.organizations enable row level security;

create policy "orgs: members read"
  on public.organizations for select
  using (public.is_org_member(id));

create policy "orgs: owner creates"
  on public.organizations for insert
  with check (owner_id = auth.uid());

create policy "orgs: editors update"
  on public.organizations for update
  using (public.is_org_editor(id))
  with check (public.is_org_editor(id));

create policy "orgs: owner deletes"
  on public.organizations for delete
  using (owner_id = auth.uid());

-- ---------------------------------------------------------------------------
-- organization_members
-- ---------------------------------------------------------------------------
alter table public.organization_members enable row level security;

create policy "members: read in my orgs"
  on public.organization_members for select
  using (public.is_org_member(organization_id));

create policy "members: editors add"
  on public.organization_members for insert
  with check (public.is_org_editor(organization_id));

create policy "members: editors update"
  on public.organization_members for update
  using (public.is_org_editor(organization_id))
  with check (public.is_org_editor(organization_id));

create policy "members: editors remove"
  on public.organization_members for delete
  using (public.is_org_editor(organization_id));

-- ---------------------------------------------------------------------------
-- Generic org-scoped tables: read for members, write for editors.
-- ---------------------------------------------------------------------------

-- customers
alter table public.customers enable row level security;
create policy "customers: members read" on public.customers for select using (public.is_org_member(organization_id));
create policy "customers: editors insert" on public.customers for insert with check (public.is_org_editor(organization_id));
create policy "customers: editors update" on public.customers for update using (public.is_org_editor(organization_id)) with check (public.is_org_editor(organization_id));
create policy "customers: editors delete" on public.customers for delete using (public.is_org_editor(organization_id));

-- price_book_items
alter table public.price_book_items enable row level security;
create policy "price_book: members read" on public.price_book_items for select using (public.is_org_member(organization_id));
create policy "price_book: editors insert" on public.price_book_items for insert with check (public.is_org_editor(organization_id));
create policy "price_book: editors update" on public.price_book_items for update using (public.is_org_editor(organization_id)) with check (public.is_org_editor(organization_id));
create policy "price_book: editors delete" on public.price_book_items for delete using (public.is_org_editor(organization_id));

-- quote_requests
alter table public.quote_requests enable row level security;
create policy "quote_requests: members read" on public.quote_requests for select using (public.is_org_member(organization_id));
create policy "quote_requests: editors insert" on public.quote_requests for insert with check (public.is_org_editor(organization_id));
create policy "quote_requests: editors update" on public.quote_requests for update using (public.is_org_editor(organization_id)) with check (public.is_org_editor(organization_id));
create policy "quote_requests: editors delete" on public.quote_requests for delete using (public.is_org_editor(organization_id));

-- quotes
alter table public.quotes enable row level security;
create policy "quotes: members read" on public.quotes for select using (public.is_org_member(organization_id));
create policy "quotes: editors insert" on public.quotes for insert with check (public.is_org_editor(organization_id));
create policy "quotes: editors update" on public.quotes for update using (public.is_org_editor(organization_id)) with check (public.is_org_editor(organization_id));
create policy "quotes: editors delete" on public.quotes for delete using (public.is_org_editor(organization_id));

-- ai_extraction_logs
alter table public.ai_extraction_logs enable row level security;
create policy "ai_logs: members read" on public.ai_extraction_logs for select using (public.is_org_member(organization_id));
create policy "ai_logs: editors insert" on public.ai_extraction_logs for insert with check (public.is_org_editor(organization_id));

-- quote_events
alter table public.quote_events enable row level security;
create policy "quote_events: members read" on public.quote_events for select using (public.is_org_member(organization_id));
create policy "quote_events: editors insert" on public.quote_events for insert with check (public.is_org_editor(organization_id));

-- ---------------------------------------------------------------------------
-- quote_line_items — scoped via the parent quote's organization.
-- ---------------------------------------------------------------------------
alter table public.quote_line_items enable row level security;

create policy "line_items: members read"
  on public.quote_line_items for select
  using (exists (
    select 1 from public.quotes q
    where q.id = quote_id and public.is_org_member(q.organization_id)
  ));

create policy "line_items: editors insert"
  on public.quote_line_items for insert
  with check (exists (
    select 1 from public.quotes q
    where q.id = quote_id and public.is_org_editor(q.organization_id)
  ));

create policy "line_items: editors update"
  on public.quote_line_items for update
  using (exists (
    select 1 from public.quotes q
    where q.id = quote_id and public.is_org_editor(q.organization_id)
  ));

create policy "line_items: editors delete"
  on public.quote_line_items for delete
  using (exists (
    select 1 from public.quotes q
    where q.id = quote_id and public.is_org_editor(q.organization_id)
  ));

-- ---------------------------------------------------------------------------
-- subscriptions — members read; writes are service-role only (Stripe webhook),
-- which bypasses RLS. No write policies for normal users by design.
-- ---------------------------------------------------------------------------
alter table public.subscriptions enable row level security;
create policy "subscriptions: members read"
  on public.subscriptions for select
  using (public.is_org_member(organization_id));

-- ---------------------------------------------------------------------------
-- quote_counters — locked down. Only the SECURITY DEFINER next_quote_number()
-- function (which runs as the table owner) may touch it.
-- ---------------------------------------------------------------------------
alter table public.quote_counters enable row level security;
-- (intentionally no policies => no direct API access)
