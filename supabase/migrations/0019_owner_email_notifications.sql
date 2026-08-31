-- Email notifications to the shop owner — distinct from the WhatsApp
-- barber/customer notifications above (0006/0010): one the moment a new
-- appointment is confirmed, one 30 minutes before it (see
-- lib/email/notify.ts). Same "claim via WHERE column = false" idempotency
-- pattern as confirmation_sent/barber_reminder_sent/customer_reminder_sent
-- already use — a cron re-scan or a retried request can never double-send.
alter table appointments
  add column owner_notification_sent boolean not null default false,
  add column owner_reminder_sent boolean not null default false;

-- notification_logs.channel only ever allowed 'whatsapp' (0006) — widen it
-- so the owner's email sends log the same way as everything else.
alter table notification_logs
  drop constraint notification_logs_channel_check;
alter table notification_logs
  add constraint notification_logs_channel_check check (channel in ('whatsapp', 'email'));

-- recipient_type only ever allowed 'barber'/'customer' — the owner is a
-- third, distinct recipient.
alter table notification_logs
  drop constraint notification_logs_recipient_type_check;
alter table notification_logs
  add constraint notification_logs_recipient_type_check check (recipient_type in ('barber', 'customer', 'owner'));
