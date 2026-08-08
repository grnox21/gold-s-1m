-- Lets an individual barber log into /admin and see only their own
-- appointments, instead of every admin_users row having full-shop access.
--
-- admin_users.role gains a third value, 'barber', and a nullable barber_id
-- pointing at the barbers row that account is scoped to. 'admin'/'owner'
-- rows keep barber_id null (full access, unchanged behavior) — application
-- code (requireAdmin() callers), not RLS, is what enforces the scoping,
-- consistent with how every other admin authorization check in this schema
-- already works (see 0002_helpers.sql's is_admin() comment).

alter table admin_users
  add column barber_id uuid references barbers (id) on delete set null;

alter table admin_users
  drop constraint admin_users_role_check;

alter table admin_users
  add constraint admin_users_role_check check (role in ('admin', 'owner', 'barber'));

alter table admin_users
  add constraint admin_users_barber_role_has_barber_id
  check (
    (role = 'barber' and barber_id is not null)
    or (role in ('admin', 'owner') and barber_id is null)
  );

create index admin_users_barber_id_idx on admin_users (barber_id) where barber_id is not null;
