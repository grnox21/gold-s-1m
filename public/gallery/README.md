Salon fotoğrafları artık bu klasörden değil, admin panelinden yönetiliyor:
`/giris/gorseller` (owner/admin girişiyle). Oradan yüklenen görseller
Supabase Storage'da saklanır ve Ana Sayfa, Galeri, Hakkımızda
sayfalarında otomatik olarak görünür — kod veya dosya değişikliği
gerekmez.

(Bu klasöre elle dosya bırakmak artık bir şey yapmaz — bkz.
src/lib/gallery-storage.ts. Sunucusuz barındırmada (Vercel gibi) buraya
yazılan dosyalar zaten her deploy'da silinirdi, bu yüzden Storage'a
taşındı.)
