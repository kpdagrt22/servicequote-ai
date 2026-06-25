-- ===========================================================================
-- 0006 — Team member invitations
--
-- Lets an organization editor (owner/admin) invite a teammate by email. The
-- invite carries an unguessable token; the invitee accepts while signed in with
-- a matching email, which enrolls them in organization_members.
--
-- RLS: editors manage invitations for their own org. Acceptance is performed by
-- a SECURITY DEFINER server path (service role) that verifies the token + email,
-- so the invitee does not need pre-existing read access. Safe to run repeatedly.
-- ===========================================================================

create table if not exists public.organization_invitations (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  email           text not null,
  role            text not null default 'member' check (role in ('admin', 'member')),
  token           uuid not null default gen_random_uuid(),
  status          text not null default 'pending' check (status in ('pending', 'accepted', 'revoked')),
  invited_by      uuid references public.profiles (id) on delete set null,
  accepted_by     uuid references public.profiles (id) on delete set null,
  expires_at      timestamptz not null default (now() + interval '14 days'),
  accepted_at     timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create unique index if not exists idx_org_invitations_token
  on public.organization_invitations (token);
create index if not exists idx_org_invitations_org
  on public.organization_invitations (organization_id);
create index if not exists idx_org_invitations_email
  on public.organization_invitations (lower(email));

-- Only one live (pending) invite per org+email.
create unique index if not exists idx_org_invitations_unique_pending
  on public.organization_invitations (organization_id, lower(email))
  where status = 'pending';

drop trigger if exists trg_org_invitations_updated on public.organization_invitations;
create trigger trg_org_invitations_updated
  before update on public.organization_invitations
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS: editors of the org manage its invitations. No anon access; acceptance
-- goes through the service-role server path which bypasses RLS.
-- ---------------------------------------------------------------------------
alter table public.organization_invitations enable row level security;

create policy "invitations: editors read"
  on public.organization_invitations for select
  using (public.is_org_editor(organization_id));

create policy "invitations: editors insert"
  on public.organization_invitations for insert
  with check (public.is_org_editor(organization_id));

create policy "invitations: editors update"
  on public.organization_invitations for update
  using (public.is_org_editor(organization_id))
  with check (public.is_org_editor(organization_id));

create policy "invitations: editors delete"
  on public.organization_invitations for delete
  using (public.is_org_editor(organization_id));
