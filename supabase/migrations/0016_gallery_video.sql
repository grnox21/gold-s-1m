-- Lets a Görseller upload be a video, not just a photo — scoped to Galeri
-- only (see the media_type filter lib/gallery-storage.ts applies for the
-- "about" placement, and the app-level check in uploadGalleryImage() that
-- never lets a video carry show_about=true regardless of what a client
-- sends). Hakkımızda only ever renders a single still photo, so it stays
-- image-only.
alter table gallery_images
  add column media_type text not null default 'image' check (media_type in ('image', 'video'));
