-- "Ana Sayfa" (home) placement removed from the Görseller admin panel —
-- the homepage's "Çalışmalarımız" section is now a code-only, drop-in
-- image set (public/calismalarimiz/*.webp, picked up by
-- lib/brand-assets.ts#listStaticWorkPhotos) that nobody can change
-- through the admin UI, only by editing files and deploying. The
-- gallery_images table now only ever needs to say "Galeri" / "Hakkımızda",
-- so the column this flag lived in is dead weight — drop it rather than
-- leave a column the app never reads or writes again.
alter table gallery_images drop column show_home;
