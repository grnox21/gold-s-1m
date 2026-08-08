import type { Metadata } from "next";
import { Plus } from "lucide-react";

import { createServiceClient } from "@/lib/supabase/service";
import { requireFullAdmin } from "@/lib/auth/admin";
import type { Service } from "@/types/database";
import { AdminPageHeading } from "@/components/admin/page-heading";
import { ServiceFormDialog } from "@/components/admin/service-form-dialog";
import { ServiceRowActions } from "@/components/admin/service-row-actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatTL } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Hizmetler" };

export default async function AdminServicesPage() {
  await requireFullAdmin();
  const supabase = createServiceClient();
  const { data } = await supabase.from("services").select("*").order("sort_order");
  const services = (data ?? []) as Service[];

  return (
    <div>
      <AdminPageHeading
        title="Hizmetler"
        description="Hizmet adı, açıklama, süre, fiyat ve aktiflik durumu."
        action={
          <ServiceFormDialog
            trigger={
              <Button size="sm">
                <Plus className="size-3.5" /> Yeni Hizmet
              </Button>
            }
          />
        }
      />

      <div className="overflow-hidden rounded-md border border-border">
        <Table>
          <TableHeader>
            <TableRow className="border-border">
              <TableHead className="pl-6">Hizmet</TableHead>
              <TableHead>Süre</TableHead>
              <TableHead>Fiyat</TableHead>
              <TableHead>Durum</TableHead>
              <TableHead className="pr-6 text-right">İşlemler</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {services.map((service) => (
              <TableRow key={service.id} className="border-border">
                <TableCell className="pl-6 font-medium text-warm-white">{service.name}</TableCell>
                <TableCell className="text-ash">{service.duration_minutes} dk</TableCell>
                <TableCell className="text-gold-bright">{formatTL(service.price)}</TableCell>
                <TableCell>
                  <Badge variant={service.is_active ? "success" : "outline"}>{service.is_active ? "Aktif" : "Pasif"}</Badge>
                </TableCell>
                <TableCell className="pr-6 text-right">
                  <ServiceRowActions service={service} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
