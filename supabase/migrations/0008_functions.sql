-- Deletes stale temporary holds. A 'held' row exists only to reserve a slot
-- while a customer finishes the booking wizard; once hold_expires_at has
-- passed it must stop occupying the calendar. The exclusion constraint has
-- no notion of "expired" — it just sees status IN ('held', ...) — so this
-- sweep is what actually frees the slot. It's cheap (indexed on
-- hold_expires_at) and is called at the top of every availability read and
-- every booking attempt, so correctness never depends on a cron running on
-- time; the cron (see /api/cron/reminders) just keeps the table tidy.
create or replace function expire_stale_holds()
returns void
language sql
as $$
  delete from appointments
  where status = 'held' and hold_expires_at < now();
$$;

-- Creates one appointment (optionally still as a temporary hold) together
-- with its service line items and a customer record, in a single
-- transaction. This is the atomicity the spec asks for: from Node, a single
-- `.rpc('create_appointment', ...)` call either fully succeeds or fully
-- fails — there's no window where an appointment row exists without its
-- services, or vice versa. The actual double-booking defense is still the
-- exclusion constraint on `appointments`; if the INSERT below violates it,
-- Postgres raises SQLSTATE 23P01 and the whole transaction (customer
-- upsert included) rolls back automatically.
create or replace function create_appointment(
  p_barber_id uuid,
  p_service_ids uuid[],
  p_start_at timestamptz,
  p_customer_name text,
  p_customer_phone text,
  p_customer_email text,
  p_customer_note text,
  p_status text default 'confirmed',
  p_hold_seconds int default 180
)
returns appointments
language plpgsql
as $$
declare
  v_customer_id uuid;
  v_total_duration int;
  v_total_price numeric(10, 2);
  v_end_at timestamptz;
  v_service_count int;
  v_appointment appointments;
begin
  if p_status not in ('held', 'confirmed') then
    raise exception 'invalid_status' using errcode = '22023';
  end if;

  if p_service_ids is null or array_length(p_service_ids, 1) is null then
    raise exception 'no_services_selected' using errcode = '22023';
  end if;

  perform expire_stale_holds();

  select count(*), coalesce(sum(duration_minutes), 0), coalesce(sum(price), 0)
    into v_service_count, v_total_duration, v_total_price
    from services
    where id = any(p_service_ids) and is_active = true;

  if v_service_count <> array_length(p_service_ids, 1) then
    raise exception 'invalid_service_selection' using errcode = '22023';
  end if;

  v_end_at := p_start_at + make_interval(mins => v_total_duration);

  select id into v_customer_id
    from customers
    where regexp_replace(phone, '\D', '', 'g') = regexp_replace(p_customer_phone, '\D', '', 'g')
    limit 1;

  if v_customer_id is null then
    insert into customers (full_name, phone, email)
    values (p_customer_name, p_customer_phone, p_customer_email)
    returning id into v_customer_id;
  else
    update customers
      set full_name = p_customer_name,
          email = coalesce(p_customer_email, email)
      where id = v_customer_id;
  end if;

  -- This INSERT is where concurrent double-bookings are decided: the
  -- exclusion constraint on (barber_id, tstzrange(start_at, end_at)) either
  -- lets exactly one of two racing requests through, or raises 23P01 for
  -- the loser. See 0005_appointments.sql.
  insert into appointments (
    barber_id, customer_id, start_at, end_at, total_duration_minutes,
    total_price, status, customer_name, customer_phone, customer_email,
    customer_note, hold_expires_at
  ) values (
    p_barber_id, v_customer_id, p_start_at, v_end_at, v_total_duration,
    v_total_price, p_status, p_customer_name, p_customer_phone, p_customer_email,
    p_customer_note,
    case when p_status = 'held' then now() + make_interval(secs => p_hold_seconds) else null end
  )
  returning * into v_appointment;

  insert into appointment_services (appointment_id, service_id, name_at_booking, price_at_booking, duration_at_booking)
  select v_appointment.id, s.id, s.name, s.price, s.duration_minutes
  from services s
  where s.id = any(p_service_ids);

  return v_appointment;
end;
$$;

revoke all on function create_appointment from public, anon, authenticated;
grant execute on function create_appointment to service_role;
revoke all on function expire_stale_holds from public, anon, authenticated;
grant execute on function expire_stale_holds to service_role;
