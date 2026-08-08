-- RLS strategy for this project:
--   The public website never talks to Supabase directly — every public page
--   is a Server Component or Route Handler using a service-role client, and
--   every booking write goes through server-side validation first. Browsers
--   only ever hold the anon key (used solely for Supabase Auth on
--   /giris/login), so RLS here is a deny-by-default backstop: nothing is
--   reachable with the anon key except the two "read active" policies below,
--   which just mirror content that's already public on the marketing site.
--   Authenticated admin access is gated through is_admin() (0002_helpers.sql).

alter table admin_users enable row level security;
alter table barbers enable row level security;
alter table services enable row level security;
alter table customers enable row level security;
alter table working_hours enable row level security;
alter table break_times enable row level security;
alter table blocked_times enable row level security;
alter table appointments enable row level security;
alter table appointment_services enable row level security;
alter table notification_logs enable row level security;
alter table site_settings enable row level security;
alter table whatsapp_settings enable row level security;

create policy admin_users_self_read on admin_users
  for select using (auth_user_id = auth.uid());

create policy barbers_public_read_active on barbers
  for select using (is_active = true);
create policy barbers_admin_all on barbers
  for all using (is_admin()) with check (is_admin());

create policy services_public_read_active on services
  for select using (is_active = true);
create policy services_admin_all on services
  for all using (is_admin()) with check (is_admin());

create policy customers_admin_all on customers
  for all using (is_admin()) with check (is_admin());

create policy working_hours_admin_all on working_hours
  for all using (is_admin()) with check (is_admin());

create policy break_times_admin_all on break_times
  for all using (is_admin()) with check (is_admin());

create policy blocked_times_admin_all on blocked_times
  for all using (is_admin()) with check (is_admin());

create policy appointments_admin_all on appointments
  for all using (is_admin()) with check (is_admin());

create policy appointment_services_admin_all on appointment_services
  for all using (is_admin()) with check (is_admin());

create policy notification_logs_admin_all on notification_logs
  for all using (is_admin()) with check (is_admin());

create policy site_settings_admin_all on site_settings
  for all using (is_admin()) with check (is_admin());

create policy whatsapp_settings_admin_all on whatsapp_settings
  for all using (is_admin()) with check (is_admin());
