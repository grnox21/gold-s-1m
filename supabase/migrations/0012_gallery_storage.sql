-- Public Storage bucket backing the admin "Görseller" page
-- (src/app/giris/(protected)/gorseller). Public read so site pages (home,
-- /galeri, /hakkimizda) can serve images directly via their public URL;
-- no admin-specific write/delete policy is needed here because uploads and
-- deletes only ever happen through requireFullAdmin()-gated Server
-- Actions using the service-role client, which bypasses RLS entirely —
-- same "RLS is a deny-by-default backstop, application code is the real
-- gate" approach the rest of this schema already uses (see 0007_rls.sql).
insert into storage.buckets (id, name, public)
values ('gallery', 'gallery', true)
on conflict (id) do nothing;

create policy gallery_public_read
  on storage.objects for select
  using (bucket_id = 'gallery');
