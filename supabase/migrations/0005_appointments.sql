-- The appointment lifecycle:
--   held      → a slot reserved for the final step of the booking wizard,
--               expires via hold_expires_at if the customer never confirms.
--   pending   → confirmed by the customer, awaiting nothing further
--               (kept distinct from `confirmed` in case the shop wants a
--               manual-confirm workflow later; the booking flow in this
--               build moves straight to `confirmed`).
--   confirmed → an active, real appointment.
--   completed / cancelled / no_show → terminal states.
--
-- held/pending/confirmed are the only statuses that occupy a calendar slot —
-- that's the WHERE clause on the exclusion constraint below.
create table appointments (
  id uuid primary key default gen_random_uuid(),
  barber_id uuid not null references barbers (id),
  customer_id uuid references customers (id),

  start_at timestamptz not null,
  end_at timestamptz not null,
  total_duration_minutes int not null check (total_duration_minutes > 0),
  total_price numeric(10, 2) not null default 0,

  status text not null default 'held'
    check (status in ('held', 'pending', 'confirmed', 'completed', 'cancelled', 'no_show')),

  -- Denormalized snapshot of who booked it, so the record is self-contained
  -- even if the customer row is later edited or removed.
  customer_name text not null,
  customer_phone text not null,
  customer_email text,
  customer_note text,

  hold_expires_at timestamptz,
  cancel_reason text,

  confirmation_sent boolean not null default false,
  barber_reminder_sent boolean not null default false,
  customer_reminder_sent boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  check (start_at < end_at),
  check (status <> 'held' or hold_expires_at is not null)
);

create trigger appointments_set_updated_at
  before update on appointments
  for each row execute function set_updated_at();

-- THE double-booking guarantee. Postgres evaluates this at INSERT/UPDATE
-- time as part of the same index operation that adds the row — there is no
-- window between "check" and "write" for a race to slip through, unlike an
-- application-level SELECT-then-INSERT check.
alter table appointments
  add constraint no_overlapping_appointments
  exclude using gist (
    barber_id with =,
    tstzrange(start_at, end_at) with &&
  )
  where (status in ('held', 'pending', 'confirmed'));

create index appointments_barber_start_idx on appointments (barber_id, start_at);
create index appointments_status_idx on appointments (status);
create index appointments_customer_phone_idx on appointments (customer_phone);
-- Used by the hold-expiry sweep (see 0008_functions.sql).
create index appointments_hold_expires_idx on appointments (hold_expires_at) where status = 'held';
-- Used by the reminder cron: "confirmed appointments starting soon that
-- haven't had a reminder sent yet".
create index appointments_reminder_lookup_idx on appointments (start_at)
  where status = 'confirmed';

-- Services attached to one appointment (a customer can book more than one).
-- Snapshots name/price/duration at booking time so later edits to `services`
-- never rewrite history on a past appointment.
create table appointment_services (
  appointment_id uuid not null references appointments (id) on delete cascade,
  service_id uuid not null references services (id),
  name_at_booking text not null,
  price_at_booking numeric(10, 2) not null,
  duration_at_booking int not null,
  primary key (appointment_id, service_id)
);

create index appointment_services_service_idx on appointment_services (service_id);
