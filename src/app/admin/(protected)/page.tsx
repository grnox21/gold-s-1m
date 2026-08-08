import type { Metadata } from "next";
import Link from "next/link";
import { CalendarClock, TrendingUp, Users, XCircle } from "lucide-react";

import { getDashboardStats } from "@/lib/admin/dashboard-data";
import { AdminPageHeading } from "@/components/admin/page-heading";
import { AppointmentStatusBadge } from "@/components/admin/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatIstanbulTime } from "@/lib/booking/time";
import { formatTL } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Dashboard" };

export default async function AdminDashboardPage() {
  const stats = await getDashboardStats();

  const kpis = [
    { label: "Bugünkü Randevular", value: String(stats.todayCount), icon: CalendarClock },
    { label: "Bu Ay Ciro (Tamamlanan)", value: formatTL(stats.monthRevenue), icon: TrendingUp },
    { label: "Bu Ay Randevu Sayısı", value: String(stats.monthAppointmentCount), icon: CalendarClock },
    { label: "Toplam Müşteri", value: String(stats.customerCount), icon: Users },
    { label: "Bu Ay İptal", value: String(stats.monthCancelledCount), icon: XCircle },
  ];

  return (
    <div>
      <AdminPageHeading title="Dashboard" description="İşletmenizin genel durumuna hızlı bakış." />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="p-5">
              <kpi.icon className="size-4 text-gold" strokeWidth={1.5} />
              <p className="tnum mt-4 font-display text-2xl text-warm-white">{kpi.value}</p>
              <p className="label-caps mt-1 text-[0.6rem] text-ash">{kpi.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Bugünün Randevuları</CardTitle>
            <Link href="/admin/randevular" className="label-caps text-[0.62rem] text-gold hover:underline">
              Tümünü Gör
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {stats.todayAppointments.length === 0 ? (
              <p className="px-6 pb-6 text-sm text-ash">Bugün için randevu yok.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-border">
                    <TableHead className="pl-6">Saat</TableHead>
                    <TableHead>Müşteri</TableHead>
                    <TableHead>Durum</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.todayAppointments.map((a) => (
                    <TableRow key={a.id} className="border-border">
                      <TableCell className="pl-6">{formatIstanbulTime(new Date(a.start_at))}</TableCell>
                      <TableCell>{a.customer_name}</TableCell>
                      <TableCell>
                        <AppointmentStatusBadge status={a.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Berber Performansı (Bu Ay)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            {stats.barberPerformance.map((b) => (
              <div key={b.barberId} className="flex items-center justify-between border-b border-border pb-4 last:border-0 last:pb-0">
                <div>
                  <p className="text-sm text-warm-white">{b.barberName}</p>
                  <p className="label-caps mt-1 text-[0.58rem] text-ash">{b.appointmentCount} randevu</p>
                </div>
                <p className="tnum text-sm text-gold-bright">{formatTL(b.revenue)}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Yaklaşan Randevular</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {stats.upcomingAppointments.length === 0 ? (
            <p className="px-6 pb-6 text-sm text-ash">Yaklaşan randevu yok.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead className="pl-6">Tarih / Saat</TableHead>
                  <TableHead>Müşteri</TableHead>
                  <TableHead>Durum</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.upcomingAppointments.map((a) => (
                  <TableRow key={a.id} className="border-border">
                    <TableCell className="pl-6">
                      {new Intl.DateTimeFormat("tr-TR", { timeZone: "Europe/Istanbul", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(a.start_at))}
                    </TableCell>
                    <TableCell>{a.customer_name}</TableCell>
                    <TableCell>
                      <AppointmentStatusBadge status={a.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
