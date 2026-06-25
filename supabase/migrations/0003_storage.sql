-- ===========================================================================
-- ServiceQuote AI — Storage buckets
--
-- Two buckets:
--   logos      — public-read business logos (shown on proposals/PDFs).
--   proposals  — generated proposal PDFs (private; served via signed URLs).
--
-- For the MVP these policies allow any authenticated user to upload and manage
-- objects. Tighten to org-scoped path prefixes before opening to many tenants
-- (see docs/ARCHITECTURE.md → "Storage hardening").
-- ===========================================================================

insert into storage.buckets (id, name, public)
values
  ('logos', 'logos', true),
  ('proposals', 'proposals', false)
on conflict (id) do nothing;

-- logos: public read, authenticated write.
create policy "logos: public read"
  on storage.objects for select
  using (bucket_id = 'logos');

create policy "logos: authenticated upload"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'logos');

create policy "logos: authenticated update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'logos');

create policy "logos: authenticated delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'logos');

-- proposals: authenticated read + write (signed URLs handed to customers).
create policy "proposals: authenticated read"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'proposals');

create policy "proposals: authenticated upload"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'proposals');

create policy "proposals: authenticated delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'proposals');
