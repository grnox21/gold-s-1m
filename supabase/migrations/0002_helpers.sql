-- Shared helpers used by later migrations.

-- Generic updated_at maintenance, attached per-table below.
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- admin_users links a Supabase Auth user to a row that grants dashboard
-- access. Created here (before barbers/services) because RLS policies on
-- almost every other table call is_admin().
create table admin_users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users (id) on delete cascade,
  full_name text not null,
  role text not null default 'admin' check (role in ('admin', 'owner')),
  created_at timestamptz not null default now()
);

-- security definer: policies that call this need to read admin_users
-- without recursively needing a policy that already lets them.
create or replace function is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from admin_users where auth_user_id = auth.uid()
  );
$$;
