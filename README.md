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
2. **SQL Editor** → `supabase/migrations/` altındaki dosyaları **sırayla** (0001 → 0013) çalıştırın. 0012, Görseller sayfasının kullandığı `gallery` adında herkese-açık-okunabilir bir Storage bucket'ı oluşturur; 0013 her görselin hangi sayfalarda göründüğünü tutan tabloyu ekler — ekstra bir şey yapmanız gerekmez.
3. `supabase/seed.sql` dosyasını çalıştırın — 3 yer tutucu berber, 8 hizmet ve çalışma saatleri ekler; hepsi `/giris` üzerinden düzenlenebilir.
4. Project Settings → API'den `URL`, `anon key` ve `service_role key` değerlerini alıp `.env.local`'e yazın.
5. İlk admin hesabınızı oluşturun (işletme sahibi/genel yönetici — tüm berberlerin tüm randevularını görür): Authentication → Users'dan bir kullanıcı ekleyin, sonra SQL Editor'de:
   ```sql
   insert into admin_users (auth_user_id, full_name, role)
   values ('<auth kullanıcısının UUID''si>', 'Adınız', 'owner');
   ```
5b. **Her berbere kendi randevularını görebileceği ayrı bir giriş** vermek isterseniz (sadece o berberin randevuları — `/giris`'in geri kalanı görünmez), bunu artık panelden yapabilirsiniz: `owner`/`admin` hesabıyla giriş yapıp **Berberler** sayfasına gidin, ilgili berberin satırındaki **"Giriş Hesabı Oluştur"** butonuna tıklayıp e-posta/şifre girin — Supabase Auth kullanıcısını oluşturmak ve `admin_users`'a `role: 'barber'` olarak bağlamak tek adımda olur. (Aynı satırdaki çöp kutusu ikonu hesabı kaldırır.)

   Panelsiz, doğrudan SQL ile yapmak isterseniz alternatif:
   ```sql
   insert into admin_users (auth_user_id, full_name, role, barber_id)
   values ('<auth kullanıcısının UUID''si>', 'Berberin Adı', 'barber', '<barbers.id>');
   ```
   `barbers.id`'yi bulmak için: `select id, name from barbers;`
6. `/api/cron/reminders`'ı dakikada bir tetikleyecek bir şey kurun — bu proje varsayılan olarak Vercel Cron'a bağlı **değildir**, çünkü Vercel'in ücretsiz (Hobby) planı yalnızca günde-bir cron zamanlamasına izin veriyor ve `vercel.json`'a dakikalık bir cron eklemek Hobby planında **deploy'un tamamını** başarısız kılıyor. Üç seçenek:
   - **Ücretsiz dış "pinger" servisi** (en kolayı, plan gerektirmez): [cron-job.org](https://cron-job.org) gibi bir servisle bu URL'yi her dakika, `Authorization: Bearer <CRON_SECRET>` header'ıyla çağırtın.
   - Supabase'de `pg_cron` + `pg_net` uzantılarını açıp aynı URL'yi bir zamanlamayla çağırın.
   - Vercel Pro'ya (ücretli plan) geçip `vercel.json`'a orijinal dakikalık cron girdisini geri ekleyin.

   Hangisini seçerseniz seçin, `.env`'de `CRON_SECRET` tanımlayın ve isteği `Authorization: Bearer $CRON_SECRET` header'ıyla gönderin.

Migration'lar hakkında detay için `supabase/README.md`'ye bakın — orada gerçek bir PostgreSQL 16 üzerinde doğrulanan şema ve **çifte rezervasyon koruması testinin** dökümü de var.

## Marka Varlıkları

**Logo** dosya olarak elle eklenir (`public/brand/logo.png` + `logo-mark.png`) — eklendiği anda Nav, Footer, favicon, Apple ikonu ve Open Graph görseli **otomatik olarak** gerçek logoyu kullanır, kod değişikliği gerekmez. Detay için `public/brand/README.md`.

**Salon fotoğrafları** ise dosya olarak eklenmez — `/giris/gorseller` sayfasından (owner/admin girişiyle) doğrudan yüklenir ve Supabase Storage'da saklanır. (Sunucusuz barındırmada `public/` klasörüne çalışma zamanında yazılan dosyalar kalıcı olmaz, bu yüzden logo gibi dosya-bırak yöntemi burada işe yaramaz — bkz. `src/lib/gallery-storage.ts`.)

Her görselin altında üç kutucuk var — **Ana Sayfa / Galeri / Hakkımızda** — hangi sayfalarda görüneceğini tek tek siz seçersiniz (birden fazlası da işaretlenebilir, hiçbiri de). Yükleme sırasındaki varsayılan üçü de işaretli, istediğiniz zaman bir görselin kutucuklarını değiştirebilirsiniz.

**Silme yalnızca `owner` rolündeki hesaba açık** — `admin` rolündeki bir giriş görsel yükleyebilir ama silemez (buton hiç görünmez, ve sunucu tarafında da ayrıca engellenir). Aynı kısıtlama **Müşteriler** sayfasındaki "Tüm Kayıtları Sil" butonu için de geçerli.

## WhatsApp

Gerçek API kimlik bilgileri olmadan sistem otomatik olarak **click-to-chat** (wa.me linki) moduna düşer — randevu akışı hiçbir zaman bu yüzden bozulmaz. Meta Cloud API veya Twilio'ya geçmek için `.env.example`'daki `WHATSAPP_*` değişkenlerini doldurup admin panelinden (WhatsApp Ayarları) sağlayıcıyı seçmeniz yeterli.

**WhatsApp Ayarları** sayfasındaki üç anahtar:
- **Otomatik bildirimler etkin** — hepsinin ana kapatma/açma anahtarı (berbere ve müşteriye giden her mesaj).
- **Randevu onayı** — müşteriye randevu oluşur oluşmaz gidecek onay mesajı.
- **30 dakika kala hatırlatma** — müşteriye randevudan 30 dakika önce gidecek hatırlatma.

Son iki anahtar yalnızca müşteriye giden mesajları etkiler; berbere giden randevu bildirimi ve hatırlatma her zaman gönderilir (ana anahtar açıkken). Biri kapalıyken gelen bir randevu/hatırlatma sessizce atlanır ve anahtar tekrar açıldığında (aynı 30dk penceresi/1 saatlik onay-tekrar-deneme penceresi içindeyse) otomatik olarak gönderilir — bir şey kaybolmaz.

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
src/app/giris/         Admin paneli (login dışında requireAdmin() ile korumalı)
src/app/api/           Randevu, müsaitlik ve cron uç noktaları
src/lib/booking/       Müsaitlik motoru, randevu motoru, telefon/tarih yardımcıları
src/lib/whatsapp/       Sağlayıcıdan bağımsız WhatsApp bildirim katmanı
src/components/        UI kiti, site bileşenleri, randevu sihirbazı, admin bileşenleri
supabase/migrations/    SQL şema (sırayla uygulanır)
```
