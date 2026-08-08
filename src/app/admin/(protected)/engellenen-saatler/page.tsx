import type { Metadata } from "next";
import { Plus } from "lucide-react";

import { createServiceClient } from "@/lib/supabase/service";
import { requireFullAdmin } from "@/lib/auth/admin";
import type { Barber, BlockedTime } from "@/types/database";
import { AdminPageHeading } from "@/components/admin/page-heading";
import { BlockedTimeFormDialog } from "@/components/admin/blocked-time-form-dialog";
import { BlockedTimeDeleteButton } from "@/components/admin/blocked-time-delete-button";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Engellenen Saatler" };

const dtFormat = new Intl.DateTimeFormat("tr-TR", {
  timeZone: "Europe/Istanbul",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export default async function AdminBlockedTimesPage() {
  await requireFullAdmin();
  const supabase = createServiceClient();
  const [{ data: blocksData }, { data: barbersData }] = await Promise.all([
    supabase.from("blocked_times").select("*").order("start_at", { ascending: false }),
    supabase.from("barbers").select("*").order("sort_order"),
  ]);

  const blocks = (blocksData ?? []) as BlockedTime[];
  const barbers = (barbersData ?? []) as Barber[];
  const barberName = (id: string | null) => (id ? barbers.find((b) => b.id === id)?.name ?? "—" : "Tüm Berberler");

  return (
    <div>
      <AdminPageHeading
        title="Engellenen Saatler"
        description="Belirli bir tarih/saat aralığını manuel olarak kapatın."
        action={
          <BlockedTimeFormDialog
            barbers={barbers}
            trigger={
              <Button size="sm">
                <Plus className="size-3.5" /> Saat Engelle
              </Button>
            }
          />
        }
      />

      <div className="overflow-hidden rounded-md border border-border">
        <Table>
          <TableHeader>
            <TableRow className="border-border">
              <TableHead className="pl-6">Berber</TableHead>
              <TableHead>Başlangıç</TableHead>
              <TableHead>Bitiş</TableHead>
              <TableHead>Sebep</TableHead>
              <TableHead className="pr-6 text-right">İşlemler</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {blocks.map((block) => (
              <TableRow key={block.id} className="border-border">
                <TableCell className="pl-6 text-warm-white">{barberName(block.barber_id)}</TableCell>
                <TableCell className="text-ash">{dtFormat.format(new Date(block.start_at))}</TableCell>
                <TableCell className="text-ash">{dtFormat.format(new Date(block.end_at))}</TableCell>
                <TableCell className="text-ash">{block.reason ?? "—"}</TableCell>
                <TableCell className="pr-6 text-right">
                  <BlockedTimeDeleteButton id={block.id} />
                </TableCell>
              </TableRow>
            ))}
            {blocks.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-ash">
                  Engellenen saat yok.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
