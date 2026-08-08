import type { Metadata } from "next";
import Link from "next/link";

import { createServiceClient } from "@/lib/supabase/service";
import { requireAdmin } from "@/lib/auth/admin";
import type { Appointment, AppointmentStatus, Barber, Service } from "@/types/database";
import { AdminPageHeading } from "@/components/admin/page-heading";
import { AppointmentStatusBadge } from "@/components/admin/status-badge";
import { AppointmentRowActions } from "@/components/admin/appointment-row-actions";
import { NewAppointmentDialog } from "@/components/admin/new-appointment-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatTL } from "@/lib/format";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Randevular" };

const STATUS_FILTERS: { value: AppointmentStatus | "all"; label: string }[] = [
  { value: "all", label: "Tümü" },
  { value: "pending", label: "Beklemede" },
  { value: "confirmed", label: "Onaylandı" },
  { value: "completed", label: "Tamamlandı" },
  { value: "cancelled", label: "İptal" },
  { value: "no_show", label: "Gelmedi" },
];

const dtFormat = new Intl.DateTimeFormat("tr-TR", {
  timeZone: "Europe/Istanbul",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export default async function AdminAppointmentsPage({
  searchParams,
}: PageProps<"/admin/randevular">) {
  const { admin } = await requireAdmin();
  const isBarber = admin.role === "barber";

  const params = await searchParams;
  const statusFilter = typeof params.status === "string" ? params.status : "all";
  // A barber login can never see another barber's appointments, no matter
  // what ?barber= is in the URL — force it to their own id.
  const barberFilter = isBarber ? (admin.barber_id ?? "all") : typeof params.barber === "string" ? params.barber : "all";

  const supabase = createServiceClient();
  let query = supabase.from("appointments").select("*").order("start_at", { ascending: false }).limit(200);
  if (statusFilter !== "all") query = query.eq("status", statusFilter);
  if (barberFilter !== "all") query = query.eq("barber_id", barberFilter);

  const [{ data: appointmentsData }, { data: barbersData }, { data: servicesData }] = await Promise.all([
    query,
    supabase.from("barbers").select("*").order("sort_order"),
    supabase.from("services").select("*").eq("is_active", true).order("sort_order"),
  ]);

  const appointments = (appointmentsData ?? []) as Appointment[];
  const allBarbers = (barbersData ?? []) as Barber[];
  // Same idea for the "berber ekle" dropdown on the new-appointment dialog
  // and the reassign control in row actions: a barber account only ever
  // sees themselves as an option.
  const barbers = isBarber ? allBarbers.filter((b) => b.id === admin.barber_id) : allBarbers;
  const services = (servicesData ?? []) as Service[];
  const barberName = (id: string) => allBarbers.find((b) => b.id === id)?.name ?? "—";

  const buildHref = (next: { status?: string; barber?: string }) => {
    const sp = new URLSearchParams();
    sp.set("status", next.status ?? statusFilter);
    sp.set("barber", next.barber ?? barberFilter);
    return `/admin/randevular?${sp.toString()}`;
  };

  return (
    <div>
      <AdminPageHeading
        title="Randevular"
        description="Tüm randevuları görüntüleyin, yeniden planlayın veya durumunu güncelleyin."
        action={<NewAppointmentDialog barbers={barbers} services={services} />}
      />

      <div className="mb-6 flex flex-wrap items-center gap-6">
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((f) => (
            <Link
              key={f.value}
              href={buildHref({ status: f.value })}
              className={cn(
                "label-caps rounded-full border px-3.5 py-1.5 text-[0.6rem] transition-colors",
                statusFilter === f.value ? "border-gold bg-gold/10 text-gold-bright" : "border-border-strong text-ash hover:text-warm-white"
              )}
            >
              {f.label}
            </Link>
          ))}
        </div>
        {/* A barber login only ever has one barber to filter by, so the
            chip row would be pointless — and would leak that other
            barbers exist. */}
        {!isBarber && (
          <div className="flex flex-wrap gap-2">
            <Link
              href={buildHref({ barber: "all" })}
              className={cn(
                "label-caps rounded-full border px-3.5 py-1.5 text-[0.6rem] transition-colors",
                barberFilter === "all" ? "border-gold bg-gold/10 text-gold-bright" : "border-border-strong text-ash hover:text-warm-white"
              )}
            >
              Tüm Berberler
            </Link>
            {allBarbers.map((b) => (
              <Link
                key={b.id}
                href={buildHref({ barber: b.id })}
                className={cn(
                  "label-caps rounded-full border px-3.5 py-1.5 text-[0.6rem] transition-colors",
                  barberFilter === b.id ? "border-gold bg-gold/10 text-gold-bright" : "border-border-strong text-ash hover:text-warm-white"
                )}
              >
                {b.name}
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-md border border-border">
        <Table>
          <TableHeader>
            <TableRow className="border-border">
              <TableHead className="pl-6">Tarih / Saat</TableHead>
              <TableHead>Müşteri</TableHead>
              <TableHead>Berber</TableHead>
              <TableHead>Süre</TableHead>
              <TableHead>Tutar</TableHead>
              <TableHead>Durum</TableHead>
              <TableHead className="pr-6 text-right">İşlemler</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {appointments.map((a) => (
              <TableRow key={a.id} className="border-border">
                <TableCell className="pl-6 text-warm-white">{dtFormat.format(new Date(a.start_at))}</TableCell>
                <TableCell>
                  <p className="text-warm-white">{a.customer_name}</p>
                  <p className="text-xs text-ash">{a.customer_phone}</p>
                </TableCell>
                <TableCell className="text-ash">{barberName(a.barber_id)}</TableCell>
                <TableCell className="text-ash">{a.total_duration_minutes} dk</TableCell>
                <TableCell className="text-gold-bright">{formatTL(a.total_price)}</TableCell>
                <TableCell>
                  <AppointmentStatusBadge status={a.status} />
                </TableCell>
                <TableCell className="pr-6 text-right">
                  <AppointmentRowActions appointment={a} barbers={barbers} />
                </TableCell>
              </TableRow>
            ))}
            {appointments.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-ash">
                  Randevu bulunamadı.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
