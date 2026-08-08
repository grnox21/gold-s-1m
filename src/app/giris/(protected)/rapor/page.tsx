import type { Metadata } from "next";
import Link from "next/link";

import { requireFullAdmin } from "@/lib/auth/admin";
import { getBarberReport } from "@/lib/admin/reports-data";
import { todayIstanbul } from "@/lib/booking/time";
import { AdminPageHeading } from "@/components/admin/page-heading";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatTL } from "@/lib/format";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Berber Raporu" };

type RangeKey = "this_month" | "last_month" | "this_year" | "custom";

const RANGE_LABELS: Record<RangeKey, string> = {
  this_month: "Bu Ay",
  last_month: "Geçen Ay",
  this_year: "Bu Yıl",
  custom: "Özel Aralık",
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function monthRange(dateStr: string, monthsAgo: number): { start: string; end: string } {
  const [y, m] = dateStr.split("-").map(Number);
  const base = new Date(Date.UTC(y, m - 1 - monthsAgo, 1));
  const year = base.getUTCFullYear();
  const month = base.getUTCMonth();
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return {
    start: `${year}-${pad(month + 1)}-01`,
    end: `${year}-${pad(month + 1)}-${pad(lastDay)}`,
  };
}

function yearRange(dateStr: string): { start: string; end: string } {
  const year = dateStr.slice(0, 4);
  return { start: `${year}-01-01`, end: `${year}-12-31` };
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export default async function AdminReportPage({ searchParams }: PageProps<"/giris/rapor">) {
  await requireFullAdmin();
  const params = await searchParams;
  const today = todayIstanbul();

  const range: RangeKey =
    params.range === "last_month" || params.range === "this_year" || params.range === "custom"
      ? params.range
      : "this_month";

  const customFrom = typeof params.from === "string" && DATE_RE.test(params.from) ? params.from : today;
  const customTo = typeof params.to === "string" && DATE_RE.test(params.to) ? params.to : today;

  const { start, end } =
    range === "this_month"
      ? monthRange(today, 0)
      : range === "last_month"
        ? monthRange(today, 1)
        : range === "this_year"
          ? yearRange(today)
          : { start: customFrom, end: customTo };

  const report = await getBarberReport(start, end);

  const rangeHref = (r: RangeKey) => `/giris/rapor?range=${r}`;
  const dtLabel = new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "long", year: "numeric" });

  return (
    <div>
      <AdminPageHeading
        title="Berber Raporu"
        description="Seçilen tarih aralığında her berberin tamamladığı randevu sayısı ve kazancı."
      />

      <div className="mb-6 flex flex-wrap items-center gap-2">
        {(["this_month", "last_month", "this_year", "custom"] as RangeKey[]).map((r) => (
          <Link
            key={r}
            href={rangeHref(r)}
            className={cn(
              "label-caps rounded-full border px-3.5 py-1.5 text-[0.6rem] transition-colors",
              range === r ? "border-gold bg-gold/10 text-gold-bright" : "border-border-strong text-ash hover:text-warm-white"
            )}
          >
            {RANGE_LABELS[r]}
          </Link>
        ))}
      </div>

      {range === "custom" && (
        <form className="mb-6 flex flex-wrap items-end gap-3" action="/giris/rapor">
          <input type="hidden" name="range" value="custom" />
          <label className="flex flex-col gap-1.5">
            <span className="label-caps text-[0.6rem] text-ash">Başlangıç</span>
            <input
              type="date"
              name="from"
              defaultValue={customFrom}
              className="rounded-sm border border-border-strong bg-surface px-3 py-2 text-sm text-warm-white"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="label-caps text-[0.6rem] text-ash">Bitiş</span>
            <input
              type="date"
              name="to"
              defaultValue={customTo}
              className="rounded-sm border border-border-strong bg-surface px-3 py-2 text-sm text-warm-white"
            />
          </label>
          <button
            type="submit"
            className="label-caps rounded-sm border border-gold bg-gold/10 px-4 py-2 text-[0.62rem] text-gold-bright transition-colors hover:bg-gold/20"
          >
            Uygula
          </button>
        </form>
      )}

      <p className="label-caps mb-6 text-[0.6rem] text-ash">
        {dtLabel.format(new Date(`${start}T12:00:00+03:00`))} — {dtLabel.format(new Date(`${end}T12:00:00+03:00`))}
      </p>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card>
          <CardContent className="p-5">
            <p className="tnum font-display text-2xl text-warm-white">{report.totals.completedCount}</p>
            <p className="label-caps mt-1 text-[0.6rem] text-ash">Tamamlanan Randevu</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="tnum font-display text-2xl text-gold-bright">{formatTL(report.totals.revenue)}</p>
            <p className="label-caps mt-1 text-[0.6rem] text-ash">Toplam Ciro</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="tnum font-display text-2xl text-warm-white">{report.totals.cancelledCount}</p>
            <p className="label-caps mt-1 text-[0.6rem] text-ash">İptal</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="tnum font-display text-2xl text-warm-white">{report.totals.noShowCount}</p>
            <p className="label-caps mt-1 text-[0.6rem] text-ash">Gelmedi</p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8 overflow-hidden rounded-md border border-border">
        <Table>
          <TableHeader>
            <TableRow className="border-border">
              <TableHead className="pl-6">Berber</TableHead>
              <TableHead>Tamamlanan</TableHead>
              <TableHead>Ciro</TableHead>
              <TableHead>Bekleyen/Onaylı</TableHead>
              <TableHead>İptal</TableHead>
              <TableHead className="pr-6">Gelmedi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {report.rows.map((r) => (
              <TableRow key={r.barberId} className="border-border">
                <TableCell className="pl-6 font-medium text-warm-white">{r.barberName}</TableCell>
                <TableCell className="text-ash">{r.completedCount}</TableCell>
                <TableCell className="tnum text-gold-bright">{formatTL(r.revenue)}</TableCell>
                <TableCell className="text-ash">{r.upcomingCount}</TableCell>
                <TableCell className="text-ash">{r.cancelledCount}</TableCell>
                <TableCell className="pr-6 text-ash">{r.noShowCount}</TableCell>
              </TableRow>
            ))}
            {report.rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-ash">
                  Berber bulunamadı.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
