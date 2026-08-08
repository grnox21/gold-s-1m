import type { Metadata } from "next";
import Link from "next/link";

import { createServiceClient } from "@/lib/supabase/service";
import { requireFullAdmin } from "@/lib/auth/admin";
import type { Barber, WorkingHour } from "@/types/database";
import { AdminPageHeading } from "@/components/admin/page-heading";
import { WorkingHoursEditor } from "@/components/admin/working-hours-editor";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Çalışma Saatleri" };

export default async function AdminWorkingHoursPage({
  searchParams,
}: PageProps<"/admin/calisma-saatleri">) {
  await requireFullAdmin();
  const params = await searchParams;
  const supabase = createServiceClient();
  const { data: barbersData } = await supabase.from("barbers").select("*").order("sort_order");
  const barbers = (barbersData ?? []) as Barber[];

  const selectedBarberId = typeof params.barber === "string" ? params.barber : barbers[0]?.id;
  const selectedBarber = barbers.find((b) => b.id === selectedBarberId);

  const { data: hoursData } = selectedBarberId
    ? await supabase.from("working_hours").select("*").eq("barber_id", selectedBarberId)
    : { data: [] };

  return (
    <div>
      <AdminPageHeading title="Çalışma Saatleri" description="Berber bazında haftalık çalışma saatleri." />

      <div className="mb-8 flex flex-wrap gap-2">
        {barbers.map((barber) => (
          <Link
            key={barber.id}
            href={`/admin/calisma-saatleri?barber=${barber.id}`}
            className={cn(
              "label-caps rounded-full border px-4 py-2 text-[0.64rem] transition-colors",
              barber.id === selectedBarberId
                ? "border-gold bg-gold/10 text-gold-bright"
                : "border-border-strong text-ash hover:text-warm-white"
            )}
          >
            {barber.name}
          </Link>
        ))}
      </div>

      {selectedBarber ? (
        <WorkingHoursEditor barberId={selectedBarber.id} existing={(hoursData ?? []) as WorkingHour[]} />
      ) : (
        <p className="text-sm text-ash">Önce bir berber ekleyin.</p>
      )}
    </div>
  );
}
