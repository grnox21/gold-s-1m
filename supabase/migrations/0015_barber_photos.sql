-- A barber's own "works" gallery — the photos shown on their public
-- profile page (/berberler/[slug]), managed from /giris/berberler (see
-- src/lib/barber-photos.ts). Distinct from barbers.photo_url, which is the
-- single headshot used on barber cards/the berberler list — a barber can
-- have any number of these. Stored in the same 'gallery' Storage bucket
-- (0012_gallery_storage.sql) under a barbers/ prefix, same as the headshot.
create table barber_photos (
  id uuid primary key default gen_random_uuid(),
  barber_id uuid not null references barbers(id) on delete cascade,
  storage_path text not null unique,
  created_at timestamptz not null default now()
);

create index barber_photos_barber_id_idx on barber_photos (barber_id, created_at desc);

alter table barber_photos enable row level security;

-- Same "RLS is a deny-by-default backstop, the service-role client (which
-- bypasses it) is the real gate" approach as gallery_images (0013) — the
-- public profile page reads this table server-side with the service-role
-- client too, so no public-read policy is needed.
create policy barber_photos_admin_all on barber_photos
  for all using (is_admin()) with check (is_admin());
