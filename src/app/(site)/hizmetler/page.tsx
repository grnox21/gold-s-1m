import type { Metadata } from "next";
import Link from "next/link";
import { Scissors } from "lucide-react";

import { PageHeader } from "@/components/site/page-header";
import { Button } from "@/components/ui/button";
import { getActiveServices } from "@/lib/site-data";
import { formatTL } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Hizmetler",
  description: "Saç kesimi, sakal tıraşı, VIP bakım ve daha fazlası — Yusuf Demir Erkek Kuaförü hizmet listesi ve fiyatları.",
};

export default async function HizmetlerPage() {
  const services = await getActiveServices();

  return (
    <>
      <PageHeader
        eyebrow="Hizmetlerimiz"
        title="Hizmetler & Fiyatlar"
        description="Randevu adımlarında birden fazla hizmet seçebilir, toplam süre ve ücreti anında görebilirsiniz."
      />

      <section className="bg-ink">
        <div className="mx-auto max-w-4xl px-6 py-20 lg:px-12 lg:py-28">
          <ul className="divide-y divide-border border-y border-border">
            {services.map((service) => (
              <li key={service.id} className="group flex flex-col gap-4 py-8 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-5">
                  <Scissors className="mt-1 size-4 shrink-0 text-gold" strokeWidth={1.4} />
                  <div>
                    <h2 className="font-display text-xl text-warm-white sm:text-2xl">{service.name}</h2>
                    {service.description && (
                      <p className="mt-2 max-w-md text-sm leading-relaxed text-ash">{service.description}</p>
                    )}
                    <p className="label-caps mt-2 text-[0.62rem] text-ash">{service.duration_minutes} dakika</p>
                  </div>
                </div>
                <div className="flex items-center gap-6 sm:flex-col sm:items-end sm:gap-1">
                  <span className="tnum font-display text-2xl text-gold-bright">{formatTL(service.price)}</span>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-16 flex flex-col items-center gap-5 text-center">
            <p className="max-w-md text-sm leading-relaxed text-ash">
              Fiyatlar ve süreler işletme tarafından güncellenebilir. Kesin bilgi için randevu adımlarını takip edin.
            </p>
            <Button asChild size="lg">
              <Link href="/randevu">Randevu Al</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
