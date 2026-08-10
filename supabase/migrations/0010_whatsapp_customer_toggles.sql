-- Lets the owner turn the customer-facing booking confirmation and the
-- 30-minute reminder off independently of each other (and of the barber's
-- own notifications, which always send whenever WhatsApp is enabled at
-- all). Previously there was no way to send one to the customer without
-- the other.
alter table whatsapp_settings
  add column send_customer_confirmation boolean not null default true,
  add column send_customer_reminder boolean not null default true;

-- `is_enabled` has existed since 0006 but application code never actually
-- read it before now — every send happened regardless of its value, even
-- though new rows default it to false. Wiring it up as the real master
-- kill switch (see src/lib/whatsapp/send.ts) would silently go dark for
-- any installation already relying on notifications working, so backfill
-- the existing row to true and flip the column default to match: turning
-- notifications off from here on is an explicit admin action, not a
-- side effect of this migration.
update whatsapp_settings set is_enabled = true where id = 1;
alter table whatsapp_settings alter column is_enabled set default true;
