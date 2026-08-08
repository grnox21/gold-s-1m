import "server-only";

import { createServiceClient } from "@/lib/supabase/service";
import { istanbulDateTime } from "@/lib/booking/time";
import type { Appointment, Barber } from "@/types/database";

export type AppointmentWithServices = Appointment & {
  serviceNames: string[];
  barberName: string;
};

/**
 * @param barberId When set (a 'barber'-role admin), only that barber's
 * appointments come back — same reasoning as getDashboardStats.
 */
export async function getAppointmentsForRange(
  startDate: string,
  endDate: string,
  barberId?: string | null
): Promise<AppointmentWithServices[]> {
  const supabase = createServiceClient();
  const rangeStart = istanbulDateTime(startDate, "00:00:00").toISOString();
  const rangeEnd = istanbulDateTime(endDate, "23:59:59").toISOString();

  let appointmentsQuery = supabase
    .from("appointments")
    .select("*, appointment_services(name_at_booking)")
    .gte("start_at", rangeStart)
    .lte("start_at", rangeEnd)
    .neq("status", "held")
    .order("start_at", { ascending: true });
  if (barberId) appointmentsQuery = appointmentsQuery.eq("barber_id", barberId);

  const [{ data: appointmentsData }, { data: barbersData }] = await Promise.all([
    appointmentsQuery,
    supabase.from("barbers").select("*"),
  ]);

  const barbers = (barbersData ?? []) as Barber[];
  const barberName = (id: string) => barbers.find((b) => b.id === id)?.name ?? "—";

  return ((appointmentsData ?? []) as (Appointment & { appointment_services: { name_at_booking: string }[] })[]).map(
    (a) => ({
      ...a,
      serviceNames: a.appointment_services.map((s) => s.name_at_booking),
      barberName: barberName(a.barber_id),
    })
  );
}
