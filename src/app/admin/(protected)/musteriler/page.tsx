import type { Metadata } from "next";

import { createServiceClient } from "@/lib/supabase/service";
import type { Customer } from "@/types/database";
import { AdminPageHeading } from "@/components/admin/page-heading";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Müşteriler" };

export default async function AdminCustomersPage() {
  const supabase = createServiceClient();
  const { data: customers } = await supabase.from("customers").select("*").order("created_at", { ascending: false });
  const { data: appointments } = await supabase.from("appointments").select("customer_id, status");

  const appointmentCounts = new Map<string, number>();
  for (const a of appointments ?? []) {
    if (!a.customer_id) continue;
    appointmentCounts.set(a.customer_id, (appointmentCounts.get(a.customer_id) ?? 0) + 1);
  }

  return (
    <div>
      <AdminPageHeading title="Müşteriler" description="Randevu alan tüm müşteriler." />

      <div className="overflow-hidden rounded-md border border-border">
        <Table>
          <TableHeader>
            <TableRow className="border-border">
              <TableHead className="pl-6">Ad Soyad</TableHead>
              <TableHead>Telefon</TableHead>
              <TableHead>E-posta</TableHead>
              <TableHead>Randevu Sayısı</TableHead>
              <TableHead className="pr-6">Kayıt Tarihi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {((customers ?? []) as Customer[]).map((customer) => (
              <TableRow key={customer.id} className="border-border">
                <TableCell className="pl-6 font-medium text-warm-white">{customer.full_name}</TableCell>
                <TableCell className="text-ash">{customer.phone}</TableCell>
                <TableCell className="text-ash">{customer.email ?? "—"}</TableCell>
                <TableCell>{appointmentCounts.get(customer.id) ?? 0}</TableCell>
                <TableCell className="pr-6 text-ash">
                  {new Intl.DateTimeFormat("tr-TR", { timeZone: "Europe/Istanbul", day: "2-digit", month: "2-digit", year: "numeric" }).format(
                    new Date(customer.created_at)
                  )}
                </TableCell>
              </TableRow>
            ))}
            {(customers ?? []).length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-ash">
                  Henüz müşteri yok.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
