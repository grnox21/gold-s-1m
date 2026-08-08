import type { Metadata } from "next";

import { BookingWizard } from "@/components/booking/booking-wizard";
import { getActiveBarbers, getActiveServices } from "@/lib/site-data";
import type { PublicBarber, PublicService } from "@/lib/booking/public-types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Randevu Al",
  description: "Yusuf Demir Erkek Kuaförü'nde online randevu alın — hizmetinizi, berberinizi ve saatinizi seçin.",
};

export default async function RandevuPage() {
  const [barbers, services] = await Promise.all([getActiveBarbers(), getActiveServices()]);

  const publicBarbers: PublicBarber[] = barbers.map((b) => ({
    id: b.id,
    name: b.name,
    slug: b.slug,
    photoUrl: b.photo_url,
    bio: b.bio,
    specialty: b.specialty,
  }));

  const publicServices: PublicService[] = services.map((s) => ({
    id: s.id,
    name: s.name,
    description: s.description,
    price: s.price,
    durationMinutes: s.duration_minutes,
  }));

  return (
    <div className="min-h-screen bg-ink pt-28 pb-20 lg:pt-32">
      <BookingWizard barbers={publicBarbers} services={publicServices} />
    </div>
  );
}
