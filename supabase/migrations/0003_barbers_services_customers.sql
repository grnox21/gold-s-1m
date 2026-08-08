create table barbers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  photo_url text,
  bio text,
  specialty text,
  whatsapp_number text not null, -- E.164, e.g. +905551112233
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger barbers_set_updated_at
  before update on barbers
  for each row execute function set_updated_at();

create table services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  price numeric(10, 2) not null check (price >= 0),
  duration_minutes int not null default 30 check (duration_minutes > 0 and duration_minutes % 15 = 0),
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger services_set_updated_at
  before update on services
  for each row execute function set_updated_at();

create table customers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text not null,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger customers_set_updated_at
  before update on customers
  for each row execute function set_updated_at();

-- Normalized-phone uniqueness (digits only) so "0532 111 22 33" and
-- "+90 532 111 22 33" resolve to the same customer record.
create unique index customers_phone_normalized_idx
  on customers (regexp_replace(phone, '\D', '', 'g'));
