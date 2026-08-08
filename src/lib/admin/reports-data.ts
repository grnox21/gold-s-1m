import "server-only";

import { createServiceClient } from "@/lib/supabase/service";
import { istanbulDateTime } from "@/lib/booking/time";
import type { Appointment, Barber } from "@/types/database";

export interface BarberReportRow {
  barberId: string;
  barberName: string;
  completedCount: number;
  revenue: number;
  cancelledCount: number;
  noShowCount: number;
  upcomingCount: number;
}

export interface BarberReport {
  rows: BarberReportRow[];
  totals: {
    completedCount: number;
    revenue: number;
    cancelledCount: number;
    noShowCount: number;
    upcomingCount: number;
  };
}

/**
 * Owner-only "who earned what" report. startDate/endDate are Istanbul
 * calendar days (YYYY-MM-DD), inclusive on both ends — same convention as
 * the takvim page's range helpers.
 */
export async function getBarberReport(startDate: string, endDate: string): Promise<BarberReport> {
  const supabase = createServiceClient();
  const rangeStart = istanbulDateTime(startDate, "00:00:00").toISOString();
  const rangeEnd = istanbulDateTime(endDate, "23:59:59").toISOString();

  const [{ data: appointmentsData }, { data: barbersData }] = await Promise.all([
    supabase
      .from("appointments")
      .select("*")
      .gte("start_at", rangeStart)
      .lte("start_at", rangeEnd),
    supabase.from("barbers").select("*").order("sort_order"),
  ]);

  const appointments = (appointmentsData ?? []) as Appointment[];
  const barbers = (barbersData ?? []) as Barber[];

  const rows: BarberReportRow[] = barbers.map((barber) => {
    const own = appointments.filter((a) => a.barber_id === barber.id);
    const completed = own.filter((a) => a.status === "completed");
    return {
      barberId: barber.id,
      barberName: barber.name,
      completedCount: completed.length,
      revenue: completed.reduce((sum, a) => sum + Number(a.total_price), 0),
      cancelledCount: own.filter((a) => a.status === "cancelled").length,
      noShowCount: own.filter((a) => a.status === "no_show").length,
      upcomingCount: own.filter((a) => a.status === "pending" || a.status === "confirmed").length,
    };
  });

  const totals = rows.reduce(
    (acc, r) => ({
      completedCount: acc.completedCount + r.completedCount,
      revenue: acc.revenue + r.revenue,
      cancelledCount: acc.cancelledCount + r.cancelledCount,
      noShowCount: acc.noShowCount + r.noShowCount,
      upcomingCount: acc.upcomingCount + r.upcomingCount,
    }),
    { completedCount: 0, revenue: 0, cancelledCount: 0, noShowCount: 0, upcomingCount: 0 }
  );

  return { rows: rows.sort((a, b) => b.revenue - a.revenue), totals };
}
