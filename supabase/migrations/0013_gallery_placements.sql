-- Per-image placement control for the Görseller admin page: which public
-- pages a given photo shows up on (Ana Sayfa / Galeri / Hakkımızda — an
-- image can be on any combination, including none). One row per uploaded
-- photo, keyed to its object in the 'gallery' Storage bucket (0012). The
-- app always writes/removes the Storage object and this row together —
-- see lib/gallery-storage.ts — so this table is the source of truth for
-- "which photos exist and where they appear"; Storage just holds bytes.
create table gallery_images (
  id uuid primary key default gen_random_uuid(),
  storage_path text not null unique,
  show_home boolean not null default true,
  show_gallery boolean not null default true,
  show_about boolean not null default true,
  created_at timestamptz not null default now()
);

create index gallery_images_created_at_idx on gallery_images (created_at desc);

alter table gallery_images enable row level security;

-- Same "RLS is a deny-by-default backstop, the service-role client (which
-- bypasses it) is the real gate" approach as every other table — see
-- 0007_rls.sql's header comment. No public-read policy needed: public
-- pages read this table server-side with the service-role client too,
-- same as site_settings.
create policy gallery_images_admin_all on gallery_images
  for all using (is_admin()) with check (is_admin());
