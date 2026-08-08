-- weekday convention matches JS Date#getDay(): 0=Pazar(Sun) .. 6=Cumartesi(Sat).
-- Kept consistent end-to-end so the availability engine can index straight
-- into these rows with `date.getDay()`, no remapping.

create table working_hours (
  id uuid primary key default gen_random_uuid(),
  barber_id uuid not null references barbers (id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  is_closed boolean not null default false,
  start_time time,
  end_time time,
  unique (barber_id, weekday),
  check (is_closed or (start_time is not null and end_time is not null and start_time < end_time))
);

create table break_times (
  id uuid primary key default gen_random_uuid(),
  barber_id uuid not null references barbers (id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  start_time time not null,
  end_time time not null,
  check (start_time < end_time)
);

create index break_times_barber_weekday_idx on break_times (barber_id, weekday);

-- barber_id null = applies to every barber (e.g. shop closed for a holiday).
create table blocked_times (
  id uuid primary key default gen_random_uuid(),
  barber_id uuid references barbers (id) on delete cascade,
  start_at timestamptz not null,
  end_at timestamptz not null,
  reason text,
  created_by uuid references admin_users (id) on delete set null,
  created_at timestamptz not null default now(),
  check (start_at < end_at)
);

create index blocked_times_barber_range_idx on blocked_times (barber_id, start_at, end_at);
