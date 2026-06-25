-- ===========================================================================
-- ServiceQuote AI — initial schema
-- Run order: 0001_init.sql -> 0002_rls.sql -> (optional) ../seed/demo.sql
-- ===========================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Shared helpers
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles  (1:1 with auth.users)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text,
  email       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger trg_profiles_updated
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Auto-create a profile row when a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- organizations
-- ---------------------------------------------------------------------------
create table if not exists public.organizations (
  id                              uuid primary key default gen_random_uuid(),
  owner_id                        uuid not null references public.profiles (id) on delete cascade,
  name                            text not null,
  trade                           text not null,
  country                         text,
  state                           text,
  city                            text,
  address                         text,
  phone                           text,
  website                         text,
  logo_url                        text,
  default_currency                text not null default 'USD',
  default_labor_rate              numeric,
  default_material_markup_percent numeric,
  default_tax_percent             numeric,
  proposal_footer                 text,
  license_text                    text,
  google_review_url               text,
  onboarding_completed            boolean not null default false,
  created_at                      timestamptz not null default now(),
  updated_at                      timestamptz not null default now()
);

create index if not exists idx_organizations_owner on public.organizations (owner_id);

create trigger trg_organizations_updated
  before update on public.organizations
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- organization_members
-- ---------------------------------------------------------------------------
create table if not exists public.organization_members (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id         uuid not null references public.profiles (id) on delete cascade,
  role            text not null default 'member' check (role in ('owner','admin','member')),
  created_at      timestamptz not null default now(),
  unique (organization_id, user_id)
);

create index if not exists idx_org_members_user on public.organization_members (user_id);
create index if not exists idx_org_members_org on public.organization_members (organization_id);

-- ---------------------------------------------------------------------------
-- Membership helper functions (SECURITY DEFINER to avoid RLS recursion).
-- ---------------------------------------------------------------------------
create or replace function public.is_org_member(org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.organization_members m
    where m.organization_id = org and m.user_id = auth.uid()
  );
$$;

create or replace function public.is_org_editor(org uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.organization_members m
    where m.organization_id = org
      and m.user_id = auth.uid()
      and m.role in ('owner','admin')
  );
$$;

-- When an organization is created, enrol the owner as an 'owner' member.
create or replace function public.handle_new_organization()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.organization_members (organization_id, user_id, role)
  values (new.id, new.owner_id, 'owner')
  on conflict (organization_id, user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_organization_created on public.organizations;
create trigger on_organization_created
  after insert on public.organizations
  for each row execute function public.handle_new_organization();

-- ---------------------------------------------------------------------------
-- customers
-- ---------------------------------------------------------------------------
create table if not exists public.customers (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name            text not null,
  email           text,
  phone           text,
  address         text,
  city            text,
  state           text,
  postal_code     text,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_customers_org on public.customers (organization_id);

create trigger trg_customers_updated
  before update on public.customers
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- price_book_items
-- ---------------------------------------------------------------------------
create table if not exists public.price_book_items (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations (id) on delete cascade,
  trade            text,
  category         text,
  name             text not null,
  description      text,
  unit             text,
  default_quantity numeric default 1,
  material_cost    numeric default 0,
  labor_minutes    numeric default 0,
  markup_percent   numeric default 0,
  price_override   numeric,
  active           boolean not null default true,
  source           text not null default 'manual',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists idx_price_book_org on public.price_book_items (organization_id);
create index if not exists idx_price_book_active on public.price_book_items (organization_id, active);

create trigger trg_price_book_updated
  before update on public.price_book_items
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- quote_requests
-- ---------------------------------------------------------------------------
create table if not exists public.quote_requests (
  id                  uuid primary key default gen_random_uuid(),
  organization_id     uuid not null references public.organizations (id) on delete cascade,
  customer_id         uuid references public.customers (id) on delete set null,
  raw_input           text,
  job_location        text,
  uploaded_image_urls text[],
  ai_status           text not null default 'pending',
  ai_confidence       numeric,
  ai_notes            text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists idx_quote_requests_org on public.quote_requests (organization_id);

create trigger trg_quote_requests_updated
  before update on public.quote_requests
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- quotes
-- ---------------------------------------------------------------------------
create table if not exists public.quotes (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations (id) on delete cascade,
  customer_id      uuid references public.customers (id) on delete set null,
  quote_request_id uuid references public.quote_requests (id) on delete set null,
  quote_number     text,
  title            text,
  scope_summary    text,
  assumptions      text,
  exclusions       text,
  status           text not null default 'draft' check (status in ('draft','sent','accepted','rejected')),
  subtotal         numeric not null default 0,
  tax_percent      numeric not null default 0,
  tax_amount       numeric not null default 0,
  total            numeric not null default 0,
  currency         text not null default 'USD',
  valid_until      date,
  pdf_url          text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists idx_quotes_org on public.quotes (organization_id);
create index if not exists idx_quotes_org_status on public.quotes (organization_id, status);
create index if not exists idx_quotes_customer on public.quotes (customer_id);

create trigger trg_quotes_updated
  before update on public.quotes
  for each row execute function public.set_updated_at();

-- Per-organization sequential quote numbers (e.g. Q-0001).
create table if not exists public.quote_counters (
  organization_id uuid primary key references public.organizations (id) on delete cascade,
  last_number     integer not null default 0
);

create or replace function public.next_quote_number(org uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer;
begin
  insert into public.quote_counters (organization_id, last_number)
  values (org, 1)
  on conflict (organization_id)
  do update set last_number = public.quote_counters.last_number + 1
  returning last_number into n;
  return 'Q-' || lpad(n::text, 4, '0');
end;
$$;

-- ---------------------------------------------------------------------------
-- quote_line_items
-- ---------------------------------------------------------------------------
create table if not exists public.quote_line_items (
  id                 uuid primary key default gen_random_uuid(),
  quote_id           uuid not null references public.quotes (id) on delete cascade,
  price_book_item_id uuid references public.price_book_items (id) on delete set null,
  sort_order         integer not null default 0,
  category           text,
  name               text not null,
  description        text,
  quantity           numeric not null default 1,
  unit               text,
  material_cost      numeric not null default 0,
  labor_minutes      numeric not null default 0,
  labor_rate         numeric not null default 0,
  markup_percent     numeric not null default 0,
  unit_price         numeric not null default 0,
  total_price        numeric not null default 0,
  ai_generated       boolean not null default false,
  confidence         numeric,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists idx_quote_line_items_quote on public.quote_line_items (quote_id);

create trigger trg_quote_line_items_updated
  before update on public.quote_line_items
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- ai_extraction_logs
-- ---------------------------------------------------------------------------
create table if not exists public.ai_extraction_logs (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations (id) on delete cascade,
  quote_request_id uuid references public.quote_requests (id) on delete set null,
  provider         text not null,
  model            text,
  input_text       text,
  output_json      jsonb,
  status           text not null,
  error_message    text,
  created_at       timestamptz not null default now()
);

create index if not exists idx_ai_logs_org on public.ai_extraction_logs (organization_id);
create index if not exists idx_ai_logs_status on public.ai_extraction_logs (status);

-- ---------------------------------------------------------------------------
-- quote_events
-- ---------------------------------------------------------------------------
create table if not exists public.quote_events (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  quote_id        uuid not null references public.quotes (id) on delete cascade,
  event_type      text not null,
  metadata        jsonb,
  created_at      timestamptz not null default now()
);

create index if not exists idx_quote_events_quote on public.quote_events (quote_id);
create index if not exists idx_quote_events_org on public.quote_events (organization_id);

-- ---------------------------------------------------------------------------
-- subscriptions
-- ---------------------------------------------------------------------------
create table if not exists public.subscriptions (
  id                     uuid primary key default gen_random_uuid(),
  organization_id        uuid not null references public.organizations (id) on delete cascade,
  stripe_customer_id     text,
  stripe_subscription_id text,
  plan                   text,
  status                 text,
  current_period_end     timestamptz,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  unique (organization_id)
);

create index if not exists idx_subscriptions_org on public.subscriptions (organization_id);

create trigger trg_subscriptions_updated
  before update on public.subscriptions
  for each row execute function public.set_updated_at();
