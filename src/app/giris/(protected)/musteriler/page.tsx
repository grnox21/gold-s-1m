import type { Metadata } from "next";

import { createServiceClient } from "@/lib/supabase/service";
import { requireFullAdmin } from "@/lib/auth/admin";
import type { Customer } from "@/types/database";
import { AdminPageHeading } from "@/components/admin/page-heading";
import { ClearCustomersButton } from "@/components/admin/clear-customers-button";
import { CustomerRowActions } from "@/components/admin/customer-row-actions";
import { TableSearchInput } from "@/components/admin/table-search-input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Müşteriler" };

/** Digits only, for a phone search that ignores spaces/parens/+ — "0532"
 * should match a number stored as "+90 532 111 22 33" just as well as one
 * typed identically to how it's stored. */
function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

export default async function AdminCustomersPage({ searchParams }: PageProps<"/giris/musteriler">) {
  const { admin } = await requireFullAdmin();
  const params = await searchParams;
  const searchTerm = typeof params.q === "string" ? params.q.trim() : "";

  const supabase = createServiceClient();
  const { data: customers } = await supabase.from("customers").select("*").order("created_at", { ascending: false });
  const { data: appointments } = await supabase.from("appointments").select("customer_id, status");

  const appointmentCounts = new Map<string, number>();
  for (const a of appointments ?? []) {
    if (!a.customer_id) continue;
    appointmentCounts.set(a.customer_id, (appointmentCounts.get(a.customer_id) ?? 0) + 1);
  }

  // Filtered in memory rather than a DB-level ilike: a single shop's
  // customer list is small, and this sidesteps escaping free text for a
  // Supabase `.or()` filter string while still allowing a phone search to
  // ignore formatting (see digitsOnly above).
  const allCustomers = (customers ?? []) as Customer[];
  const lowerTerm = searchTerm.toLowerCase();
  const digitTerm = digitsOnly(searchTerm);
  const visibleCustomers = searchTerm
    ? allCustomers.filter((c) => {
        if (c.full_name.toLowerCase().includes(lowerTerm)) return true;
        if (c.email?.toLowerCase().includes(lowerTerm)) return true;
        if (digitTerm && digitsOnly(c.phone).includes(digitTerm)) return true;
        if (c.phone.toLowerCase().includes(lowerTerm)) return true;
        return false;
      })
    : allCustomers;

  const isOwner = admin.role === "owner";

  return (
    <div>
      <AdminPageHeading
        title="Müşteriler"
        description="Randevu alan tüm müşteriler."
        action={<ClearCustomersButton count={allCustomers.length} isOwner={isOwner} />}
      />

      <div className="mb-6">
        <TableSearchInput placeholder="İsim, telefon veya e-posta ile ara…" />
      </div>

      <div className="overflow-hidden rounded-md border border-border">
        <Table>
          <TableHeader>
            <TableRow className="border-border">
              <TableHead className="pl-6">Ad Soyad</TableHead>
              <TableHead>Telefon</TableHead>
              <TableHead>E-posta</TableHead>
              <TableHead>Randevu Sayısı</TableHead>
              <TableHead className={isOwner ? "" : "pr-6"}>Kayıt Tarihi</TableHead>
              {isOwner && <TableHead className="pr-6 text-right">İşlemler</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleCustomers.map((customer) => (
              <TableRow key={customer.id} className="border-border">
                <TableCell className="pl-6 font-medium text-warm-white">{customer.full_name}</TableCell>
                <TableCell className="text-ash">{customer.phone}</TableCell>
                <TableCell className="text-ash">{customer.email ?? "—"}</TableCell>
                <TableCell>{appointmentCounts.get(customer.id) ?? 0}</TableCell>
                <TableCell className={isOwner ? "text-ash" : "pr-6 text-ash"}>
                  {new Intl.DateTimeFormat("tr-TR", { timeZone: "Europe/Istanbul", day: "2-digit", month: "2-digit", year: "numeric" }).format(
                    new Date(customer.created_at)
                  )}
                </TableCell>
                {isOwner && (
                  <TableCell className="pr-6 text-right">
                    <CustomerRowActions customer={customer} />
                  </TableCell>
                )}
              </TableRow>
            ))}
            {visibleCustomers.length === 0 && (
              <TableRow>
                <TableCell colSpan={isOwner ? 6 : 5} className="py-10 text-center text-ash">
                  {searchTerm ? "Aramanızla eşleşen müşteri bulunamadı." : "Henüz müşteri yok."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
