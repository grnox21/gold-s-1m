-- Video support in Görseller/Galeri (0016) was reverted at the shop
-- owner's request — back to photos only. Drop the column the app no
-- longer reads or writes, same "don't leave dead weight behind" call as
-- 0014_gallery_home_removed.sql made for show_home.
alter table gallery_images drop column media_type;
