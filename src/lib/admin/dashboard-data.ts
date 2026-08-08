import "server-only";

import { createServiceClient } from "@/lib/supabase/service";
import { todayIstanbul, istanbulDateTime } from "@/lib/booking/time";
import type { Appointment, Barber } from "@/types/database";

export interface BarberPerformance {
  barberId: string;
  barberName: string;
  appointmentCount: number;
  revenue: number;
}

export interface DashboardStats {
  todayCount: number;
  todayAppointments: Appointment[];
  upcomingAppointments: Appointment[];
  monthRevenue: number;
  monthAppointmentCount: number;
  monthCancelledCount: number;
  customerCount: number;
  barberPerformance: BarberPerformance[];
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const supabase = createServiceClient();
  const today = todayIstanbul();
  const todayStart = istanbulDateTime(today, "00:00:00").toISOString();
  const todayEnd = istanbulDateTime(today, "23:59:59").toISOString();

  const monthStartDate = `${today.slice(0, 7)}-01`;
  const monthStart = istanbulDateTime(monthStartDate, "00:00:00").toISOString();

  const [todayRes, upcomingRes, monthRes, barbersRes, customersRes] = await Promise.all([
    supabase
      .from("appointments")
      .select("*")
      .gte("start_at", todayStart)
      .lte("start_at", todayEnd)
      .in("status", ["pending", "confirmed", "completed"])
      .order("start_at", { ascending: true }),
    supabase
      .from("appointments")
      .select("*")
      .gt("start_at", new Date().toISOString())
      .in("status", ["pending", "confirmed"])
      .order("start_at", { ascending: true })
      .limit(8),
    supabase.from("appointments").select("*").gte("start_at", monthStart),
    supabase.from("barbers").select("*").eq("is_active", true).order("sort_order"),
    supabase.from("customers").select("id", { count: "exact", head: true }),
  ]);

  const monthAppointments = (monthRes.data ?? []) as Appointment[];
  const barbers = (barbersRes.data ?? []) as Barber[];

  const monthRevenue = monthAppointments
    .filter((a) => a.status === "completed")
    .reduce((sum, a) => sum + Number(a.total_price), 0);

  const monthCancelledCount = monthAppointments.filter((a) => a.status === "cancelled").length;

  const barberPerformance: BarberPerformance[] = barbers.map((barber) => {
    const barberAppointments = monthAppointments.filter((a) => a.barber_id === barber.id && a.status !== "cancelled");
    return {
      barberId: barber.id,
      barberName: barber.name,
      appointmentCount: barberAppointments.length,
      revenue: barberAppointments.filter((a) => a.status === "completed").reduce((sum, a) => sum + Number(a.total_price), 0),
    };
  });

  return {
    todayCount: (todayRes.data ?? []).length,
    todayAppointments: (todayRes.data ?? []) as Appointment[],
    upcomingAppointments: (upcomingRes.data ?? []) as Appointment[],
    monthRevenue,
    monthAppointmentCount: monthAppointments.filter((a) => a.status !== "cancelled").length,
    monthCancelledCount,
    customerCount: customersRes.count ?? 0,
    barberPerformance,
  };
}
