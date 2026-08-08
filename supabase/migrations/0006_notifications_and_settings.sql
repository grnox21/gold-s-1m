create table notification_logs (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid references appointments (id) on delete cascade,
  channel text not null default 'whatsapp' check (channel in ('whatsapp')),
  recipient_type text not null check (recipient_type in ('barber', 'customer')),
  recipient_number text,
  template text not null, -- e.g. booking_notification_barber, reminder_customer
  status text not null check (status in ('sent', 'failed', 'skipped')),
  provider_message_id text,
  error text,
  created_at timestamptz not null default now()
);

create index notification_logs_appointment_idx on notification_logs (appointment_id);

-- Single-row key/value table for editable site copy (address, phone, social,
-- opening hours, SEO fields). Relational structure isn't warranted here —
-- every row is an independent scalar the admin edits from a plain form.
create table site_settings (
  key text primary key,
  value text,
  updated_at timestamptz not null default now()
);

create trigger site_settings_set_updated_at
  before update on site_settings
  for each row execute function set_updated_at();

-- Singleton (id is always 1): WhatsApp provider configuration. Only
-- non-secret fields live here — API tokens stay in server env vars and are
-- never written to the database or returned to the browser.
create table whatsapp_settings (
  id smallint primary key default 1 check (id = 1),
  provider text not null default 'click_to_chat'
    check (provider in ('click_to_chat', 'meta_cloud', 'twilio')),
  phone_number_id text,
  business_number text,
  is_enabled boolean not null default false,
  updated_at timestamptz not null default now()
);

create trigger whatsapp_settings_set_updated_at
  before update on whatsapp_settings
  for each row execute function set_updated_at();

insert into whatsapp_settings (id) values (1);
