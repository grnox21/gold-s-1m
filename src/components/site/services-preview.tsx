import Link from "next/link";
import { ArrowUpRight, Scissors } from "lucide-react";

import type { Service } from "@/types/database";
import { SectionHeading } from "./section-heading";
import { Reveal } from "./reveal";
import { Button } from "@/components/ui/button";
import { formatTL } from "@/lib/format";

export function ServicesPreview({ services }: { services: Service[] }) {
  return (
    <section className="bg-ink">
      <div className="mx-auto max-w-7xl px-6 py-24 lg:px-12 lg:py-32">
        <div className="flex flex-col items-start justify-between gap-8 sm:flex-row sm:items-end">
          <SectionHeading title="Hizmetler" description="Hizmetlerimiz — Her ihtiyaca uygun, özenle sunulan bakım hizmetleri." />
          <Button asChild variant="outline" size="sm" className="shrink-0">
            <Link href="/hizmetler">
              Tüm Hizmetler <ArrowUpRight className="size-3.5" />
            </Link>
          </Button>
        </div>

        <Reveal stagger={0.08} className="mt-14 grid grid-cols-1 gap-px overflow-hidden rounded-md border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
          {services.slice(0, 6).map((service) => (
            <Link
              key={service.id}
              href="/randevu"
              className="group relative flex flex-col justify-between gap-8 bg-charcoal p-8 transition-[background-color,transform] duration-300 ease-out hover:z-10 hover:-translate-y-1.5 hover:bg-charcoal-2 hover:shadow-[0_24px_40px_-24px_rgba(0,0,0,0.6)]"
            >
              <div>
                <Scissors className="size-5 text-gold" strokeWidth={1.4} />
                <h3 className="mt-6 font-display text-xl text-warm-white">{service.name}</h3>
                {service.description && (
                  <p className="mt-3 text-sm leading-relaxed text-ash">{service.description}</p>
                )}
              </div>
              <div className="flex items-center justify-between border-t border-border pt-5">
                <span className="tnum text-sm text-gold-bright">{formatTL(service.price)}</span>
                <span className="label-caps text-[0.6rem] text-ash">{service.duration_minutes} dk</span>
              </div>
            </Link>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
