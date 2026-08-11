-- Lets the owner bulk-clear the customers table (see
-- src/app/giris/(protected)/musteriler/actions.ts) without existing
-- appointments blocking on the FK. Appointments already keep their own
-- denormalized customer_name/customer_phone/customer_email/customer_note
-- snapshot (see 0005_appointments.sql's comment on those columns), so
-- losing the customers row costs nothing on appointment/randevu history —
-- only customer_id goes null.
alter table appointments
  drop constraint appointments_customer_id_fkey;

alter table appointments
  add constraint appointments_customer_id_fkey
  foreign key (customer_id) references customers (id) on delete set null;
