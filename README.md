# Yusuf Demir Erkek Kuaförü

Premium erkek kuaförü web sitesi ve randevu sistemi: Next.js 16 (App Router) + Supabase/PostgreSQL, gerçek çift-katmanlı çifte-rezervasyon koruması, çok-berberli müsaitlik motoru, admin paneli ve WhatsApp bildirim altyapısı.

## Teknoloji

Next.js 16 · TypeScript · Tailwind CSS v4 · Supabase (Postgres, Auth, RLS) · GSAP + Lenis · React Hook Form + Zod

## Hızlı Başlangıç

```bash
npm install
cp .env.example .env.local   # aşağıdaki "Supabase Kurulumu" bölümüne bakın
npm run dev
```

`npm run build` her zaman gerçek `.env` değerleri olmadan da başarılı olur — veriye dokunan her sayfa `force-dynamic`'tir, yani derleme sırasında değil, istek anında veri çeker.

## Supabase Kurulumu

1. [supabase.com](https://supabase.com) üzerinde bir proje oluşturun (veya self-host edin).
2. **SQL Editor** → `supabase/migrations/` altındaki dosyaları **sırayla** (0001 → 0008) çalıştırın.
3. `supabase/seed.sql` dosyasını çalıştırın — 3 yer tutucu berber, 8 hizmet ve çalışma saatleri ekler; hepsi `/admin` üzerinden düzenlenebilir.
4. Project Settings → API'den `URL`, `anon key` ve `service_role key` değerlerini alıp `.env.local`'e yazın.
5. İlk admin hesabınızı oluşturun: Authentication → Users'dan bir kullanıcı ekleyin, sonra SQL Editor'de:
   ```sql
   insert into admin_users (auth_user_id, full_name, role)
   values ('<auth kullanıcısının UUID''si>', 'Adınız', 'owner');
   ```
6. (Opsiyonel ama önerilir) `pg_cron` uzantısını açın — `/api/cron/reminders` zaten Vercel Cron ile çalışır (bkz. `vercel.json`), pg_cron sadece Vercel dışı bir barındırma için alternatiftir.

Migration'lar hakkında detay için `supabase/README.md`'ye bakın — orada gerçek bir PostgreSQL 16 üzerinde doğrulanan şema ve **çifte rezervasyon koruması testinin** dökümü de var.

## Gerçek Marka Varlıkları

Sohbette paylaşılan logo ve mekân fotoğrafı bu ortamda diske kaydedilemedi (mesaj içi görselleri dosyaya çıkaran bir araç yok) — site şimdilik tipografik bir "Yusuf Demir" wordmark'ı ve tasarlanmış bir hero/galeri boş durumuyla geliyor. Gerçek dosyaları eklemek için:

- `public/brand/logo.png` — saydam, siyah daire kaldırılmış logo
- `public/gallery/*.jpg` — mekân fotoğrafları (herhangi bir dosya adı)

İkisi de eklendiği anda hero, galeri, footer ve favicon **otomatik olarak** gerçek görselleri kullanır — kod değişikliği gerekmez. Detay için `public/brand/README.md` ve `public/gallery/README.md`.

## WhatsApp

Gerçek API kimlik bilgileri olmadan sistem otomatik olarak **click-to-chat** (wa.me linki) moduna düşer — randevu akışı hiçbir zaman bu yüzden bozulmaz. Meta Cloud API veya Twilio'ya geçmek için `.env.example`'daki `WHATSAPP_*` değişkenlerini doldurup admin panelinden (WhatsApp Ayarları) sağlayıcıyı seçmeniz yeterli.

## Test

```bash
npm run test:booking   # müsaitlik motorunun 17 senaryosu (gerçek motor kodu, sahte Supabase client'ı ile)
npm run lint
npm run build
```

Çifte rezervasyon koruması ayrıca gerçek bir PostgreSQL 16 üzerinde de doğrulandı — bkz. `supabase/README.md`.

## Proje Yapısı

```
src/app/(site)/       Genel site sayfaları
src/app/admin/         Admin paneli (login dışında requireAdmin() ile korumalı)
src/app/api/           Randevu, müsaitlik ve cron uç noktaları
src/lib/booking/       Müsaitlik motoru, randevu motoru, telefon/tarih yardımcıları
src/lib/whatsapp/       Sağlayıcıdan bağımsız WhatsApp bildirim katmanı
src/components/        UI kiti, site bileşenleri, randevu sihirbazı, admin bileşenleri
supabase/migrations/    SQL şema (sırayla uygulanır)
```
