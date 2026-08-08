-- Placeholder seed data, editable from /giris afterwards.
-- Run via `supabase db reset` (local) or paste into the SQL editor once on
-- a fresh project.

insert into barbers (name, slug, bio, specialty, whatsapp_number, sort_order) values
  ('Yusuf Demir', 'yusuf-demir', 'Yusuf Demir Erkek Kuaförü''nün kurucusu. Klasik ve modern erkek tıraşında uzman.', 'Klasik Tıraş & Sakal Tasarımı', '+905000000001', 0),
  ('Berber 2', 'berber-2', 'Bilgileri admin panelinden güncelleyin.', 'Saç Şekillendirme', '+905000000002', 1),
  ('Berber 3', 'berber-3', 'Bilgileri admin panelinden güncelleyin.', 'Çocuk Tıraşı', '+905000000003', 2);

insert into services (name, description, price, duration_minutes, sort_order) values
  ('Saç Kesimi', 'Klasik ve modern saç kesim teknikleriyle kişiye özel stil.', 500, 30, 0),
  ('Sakal Tıraşı', 'Sıcak havlu ve ustura ile geleneksel sakal tıraşı.', 300, 30, 1),
  ('Saç + Sakal', 'Saç kesimi ve sakal tıraşının birlikte uygulanması.', 750, 60, 2),
  ('Çocuk Saç Kesimi', '12 yaş altı çocuklar için nazik saç kesimi.', 350, 30, 3),
  ('Saç Yıkama', 'Bakım şampuanlarıyla saç yıkama.', 150, 30, 4),
  ('Fön / Şekillendirme', 'Saç kurutma ve şekillendirme.', 200, 30, 5),
  ('Saç & Sakal Şekillendirme', 'Ürünlerle detaylı saç ve sakal şekillendirme.', 400, 30, 6),
  ('VIP Bakım', 'Saç, sakal, cilt bakımını içeren kapsamlı VIP paket.', 1000, 60, 7);

-- Working hours for every barber: Mon–Thu 09:00–20:00, Fri–Sat 09:00–22:00,
-- Sun closed. weekday: 0=Pazar .. 6=Cumartesi (matches JS Date#getDay()).
insert into working_hours (barber_id, weekday, is_closed, start_time, end_time)
select b.id, w.weekday, w.is_closed, w.start_time, w.end_time
from barbers b
cross join (values
  (0, true, null::time, null::time),   -- Pazar
  (1, false, '09:00'::time, '20:00'::time), -- Pazartesi
  (2, false, '09:00'::time, '20:00'::time), -- Salı
  (3, false, '09:00'::time, '20:00'::time), -- Çarşamba
  (4, false, '09:00'::time, '20:00'::time), -- Perşembe
  (5, false, '09:00'::time, '22:00'::time), -- Cuma
  (6, false, '09:00'::time, '22:00'::time)  -- Cumartesi
) as w(weekday, is_closed, start_time, end_time);

-- A one-hour lunch break, every working day, for every barber.
insert into break_times (barber_id, weekday, start_time, end_time)
select b.id, wd, '13:00'::time, '14:00'::time
from barbers b
cross join generate_series(1, 6) as wd;

insert into site_settings (key, value) values
  ('address', 'Adres bilgisi admin panelinden eklenecek'),
  ('phone', '+90 000 000 00 00'),
  ('whatsapp_display_number', '+90 000 000 00 00'),
  ('instagram_url', 'https://instagram.com/yusufdemirkuafor'),
  ('google_maps_url', ''),
  ('opening_hours_note', 'Pazartesi–Perşembe 09:00–20:00 · Cuma–Cumartesi 09:00–22:00 · Pazar kapalı'),
  ('meta_title', 'Yusuf Demir Erkek Kuaförü | Premium Erkek Kuaförü'),
  ('meta_description', 'Yusuf Demir Erkek Kuaförü''nde saç kesimi, sakal tıraşı ve VIP bakım hizmetlerinde premium deneyim. Online randevunuzu hemen oluşturun.')
on conflict (key) do nothing;
