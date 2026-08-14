-- Supabase Storage enforces its own per-bucket file_size_limit at the
-- Storage API level — independent of, and in addition to, this app's own
-- MAX_GALLERY_VIDEO_BYTES check (lib/gallery-constants.ts). The 'gallery'
-- bucket was created in 0012_gallery_storage.sql without one, which means
-- it was silently falling back to the Supabase project's global default
-- (Dashboard → Storage → Settings) — a value this app has no control
-- over and that can be lower than 50MB, so a video under our own limit
-- could still get rejected by Storage before ever reaching app code.
-- Setting it explicitly here keeps the two limits in sync regardless of
-- the project's dashboard settings.
update storage.buckets
set file_size_limit = 52428800 -- 50MB, matches MAX_GALLERY_VIDEO_BYTES
where id = 'gallery';
