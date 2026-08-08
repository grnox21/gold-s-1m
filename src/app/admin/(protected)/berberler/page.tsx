import type { Metadata } from "next";
import { Plus } from "lucide-react";

import { createServiceClient } from "@/lib/supabase/service";
import { requireFullAdmin } from "@/lib/auth/admin";
import type { Barber } from "@/types/database";
import { AdminPageHeading } from "@/components/admin/page-heading";
import { BarberFormDialog } from "@/components/admin/barber-form-dialog";
import { BarberRowActions } from "@/components/admin/barber-row-actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Berberler" };

export default async function AdminBarbersPage() {
  await requireFullAdmin();
  const supabase = createServiceClient();
  const { data } = await supabase.from("barbers").select("*").order("sort_order");
  const barbers = (data ?? []) as Barber[];

  return (
    <div>
      <AdminPageHeading
        title="Berberler"
        description="Sitede gösterilen berberler ve iletişim bilgileri."
        action={
          <BarberFormDialog
            trigger={
              <Button size="sm">
                <Plus className="size-3.5" /> Yeni Berber
              </Button>
            }
          />
        }
      />

      <div className="overflow-hidden rounded-md border border-border">
        <Table>
          <TableHeader>
            <TableRow className="border-border">
              <TableHead className="pl-6">İsim</TableHead>
              <TableHead>Uzmanlık</TableHead>
              <TableHead>WhatsApp</TableHead>
              <TableHead>Durum</TableHead>
              <TableHead className="pr-6 text-right">İşlemler</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {barbers.map((barber) => (
              <TableRow key={barber.id} className="border-border">
                <TableCell className="pl-6 font-medium text-warm-white">{barber.name}</TableCell>
                <TableCell className="text-ash">{barber.specialty ?? "—"}</TableCell>
                <TableCell className="text-ash">{barber.whatsapp_number}</TableCell>
                <TableCell>
                  <Badge variant={barber.is_active ? "success" : "outline"}>{barber.is_active ? "Aktif" : "Pasif"}</Badge>
                </TableCell>
                <TableCell className="pr-6 text-right">
                  <BarberRowActions barber={barber} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
