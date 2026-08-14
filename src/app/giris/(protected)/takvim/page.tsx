import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { createServiceClient } from "@/lib/supabase/service";
import { requireAdmin } from "@/lib/auth/admin";
import { getAppointmentsForRange, type AppointmentWithServices } from "@/lib/admin/calendar-data";
import { todayIstanbul, formatIstanbulTime } from "@/lib/booking/time";
import { AdminPageHeading } from "@/components/admin/page-heading";
import { AppointmentStatusBadge } from "@/components/admin/status-badge";
import { AppointmentRowActions } from "@/components/admin/appointment-row-actions";
import type { Barber } from "@/types/database";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Takvim" };

type View = "day" | "week" | "month";

function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T12:00:00+03:00`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function startOfWeek(dateStr: string): string {
  const weekday = new Date(`${dateStr}T12:00:00+03:00`).getUTCDay(); // 0=Sun
  const diff = weekday === 0 ? -6 : 1 - weekday; // back to Monday
  return addDays(dateStr, diff);
}

function startOfMonth(dateStr: string): string {
  return `${dateStr.slice(0, 7)}-01`;
}

function endOfMonth(dateStr: string): string {
  const [y, m] = dateStr.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return `${dateStr.slice(0, 7)}-${String(last).padStart(2, "0")}`;
}

export default async function AdminCalendarPage({ searchParams }: PageProps<"/giris/takvim">) {
  const { admin } = await requireAdmin();
  const isBarber = admin.role === "barber";

  const params = await searchParams;
  const view: View = params.view === "week" || params.view === "month" ? params.view : "day";
  const date = typeof params.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(params.date) ? params.date : todayIstanbul();

  const rangeStart = view === "day" ? date : view === "week" ? startOfWeek(date) : startOfMonth(date);
  const rangeEnd = view === "day" ? date : view === "week" ? addDays(startOfWeek(date), 6) : endOfMonth(date);

  const [appointments, barbersRes] = await Promise.all([
    getAppointmentsForRange(rangeStart, rangeEnd, isBarber ? admin.barber_id : null),
    createServiceClient().from("barbers").select("*"),
  ]);
  const allBarbers = (barbersRes.data ?? []) as Barber[];
  const barbers = isBarber ? allBarbers.filter((b) => b.id === admin.barber_id) : allBarbers;

  const prevDate = view === "day" ? addDays(date, -1) : view === "week" ? addDays(date, -7) : addDays(startOfMonth(date), -1);
  const nextDate = view === "day" ? addDays(date, 1) : view === "week" ? addDays(date, 7) : addDays(endOfMonth(date), 1);

  const viewHref = (v: View, d: string) => `/giris/takvim?view=${v}&date=${d}`;

  return (
    <div>
      <AdminPageHeading title="Takvim" description="Randevuları gün, hafta veya ay bazında görüntüleyin." />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex gap-2">
          {(["day", "week", "month"] as View[]).map((v) => (
            <Link
              key={v}
              href={viewHref(v, date)}
              className={cn(
                "label-caps rounded-full border px-4 py-2 text-[0.62rem] transition-colors",
                view === v ? "border-gold bg-gold/10 text-gold-bright" : "border-border-strong text-ash hover:text-warm-white"
              )}
            >
              {v === "day" ? "Gün" : v === "week" ? "Hafta" : "Ay"}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <Link href={viewHref(view, prevDate)} className="flex size-8 items-center justify-center rounded-full border border-border-strong text-ash hover:text-gold">
            <ChevronLeft className="size-4" />
          </Link>
          <p className="label-caps text-[0.66rem] text-warm-white">
            {new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "long", year: "numeric" }).format(new Date(`${date}T12:00:00+03:00`))}
          </p>
          <Link href={viewHref(view, nextDate)} className="flex size-8 items-center justify-center rounded-full border border-border-strong text-ash hover:text-gold">
            <ChevronRight className="size-4" />
          </Link>
          <Link href={viewHref(view, todayIstanbul())} className="label-caps ml-2 text-[0.6rem] text-gold hover:underline">
            Bugün
          </Link>
        </div>
      </div>

      {view === "month" ? (
        <MonthGrid date={date} appointments={appointments} />
      ) : view === "week" ? (
        <WeekAgenda rangeStart={rangeStart} appointments={appointments} />
      ) : (
        <DayAgenda appointments={appointments} barbers={barbers} isOwner={admin.role === "owner"} />
      )}
    </div>
  );
}

function DayAgenda({
  appointments,
  barbers,
  isOwner,
}: {
  appointments: AppointmentWithServices[];
  barbers: Barber[];
  isOwner: boolean;
}) {
  if (appointments.length === 0) {
    return <p className="rounded-md border border-dashed border-border-strong py-16 text-center text-sm text-ash">Bu gün için randevu yok.</p>;
  }
  return (
    <div className="divide-y divide-border rounded-md border border-border">
      {appointments.map((a) => (
        <div key={a.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
          <span className="tnum w-16 shrink-0 text-sm text-gold-bright">{formatIstanbulTime(new Date(a.start_at))}</span>
          <div className="min-w-[160px] flex-1">
            <p className="text-sm text-warm-white">{a.customer_name}</p>
            <p className="text-xs text-ash">{a.serviceNames.join(" + ")}</p>
          </div>
          <span className="w-32 shrink-0 text-sm text-ash">{a.barberName}</span>
          <AppointmentStatusBadge status={a.status} />
          <AppointmentRowActions appointment={a} barbers={barbers} isOwner={isOwner} />
        </div>
      ))}
    </div>
  );
}

function WeekAgenda({
  rangeStart,
  appointments,
}: {
  rangeStart: string;
  appointments: AppointmentWithServices[];
}) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(rangeStart, i));
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-7">
      {days.map((day) => {
        const dayAppointments = appointments.filter((a) => localDateMatches(a.start_at, day));
        return (
          <div key={day} className="rounded-md border border-border">
            <div className="border-b border-border px-3 py-2.5">
              <p className="label-caps text-[0.6rem] text-ash">
                {new Intl.DateTimeFormat("tr-TR", { weekday: "short", day: "2-digit" }).format(new Date(`${day}T12:00:00+03:00`))}
              </p>
            </div>
            <div className="divide-y divide-border">
              {dayAppointments.length === 0 ? (
                <p className="px-3 py-4 text-xs text-ash">—</p>
              ) : (
                dayAppointments.map((a) => (
                  <div key={a.id} className="px-3 py-2.5">
                    <p className="tnum text-xs text-gold-bright">{formatIstanbulTime(new Date(a.start_at))}</p>
                    <p className="mt-0.5 truncate text-xs text-warm-white">{a.customer_name}</p>
                    <div className="mt-1">
                      <AppointmentStatusBadge status={a.status} />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function localDateMatches(iso: string, dateStr: string) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(
    new Date(iso)
  );
  const get = (t: string) => parts.find((p) => p.type === t)?.value;
  return `${get("year")}-${get("month")}-${get("day")}` === dateStr;
}

function MonthGrid({ date, appointments }: { date: string; appointments: AppointmentWithServices[] }) {
  const monthStart = startOfMonth(date);
  const [y, m] = monthStart.split("-").map(Number);
  const firstWeekday = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7; // Monday-first
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();

  const countByDay = new Map<string, number>();
  for (const a of appointments) {
    const d = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul", year: "numeric", month: "2-digit", day: "2-digit" }).format(
      new Date(a.start_at)
    );
    countByDay.set(d, (countByDay.get(d) ?? 0) + 1);
  }

  const cells: (string | null)[] = Array.from({ length: firstWeekday }, () => null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(`${monthStart.slice(0, 8)}${String(d).padStart(2, "0")}`);

  return (
    <div>
      <div className="grid grid-cols-7 gap-2 text-center">
        {["Pt", "Sa", "Ça", "Pe", "Cu", "Ct", "Pz"].map((w) => (
          <span key={w} className="label-caps py-2 text-[0.6rem] text-ash">
            {w}
          </span>
        ))}
        {cells.map((day, i) => {
          if (!day) return <div key={`b-${i}`} />;
          const count = countByDay.get(day) ?? 0;
          return (
            <Link
              key={day}
              href={`/giris/takvim?view=day&date=${day}`}
              className={cn(
                "flex aspect-square flex-col items-center justify-center gap-1 rounded-sm border transition-colors",
                day === todayIstanbul() ? "border-gold/60" : "border-border hover:border-border-strong"
              )}
            >
              <span className="tnum text-sm text-warm-white">{Number(day.slice(8, 10))}</span>
              {count > 0 && <span className="label-caps text-[0.56rem] text-gold-bright">{count} randevu</span>}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
