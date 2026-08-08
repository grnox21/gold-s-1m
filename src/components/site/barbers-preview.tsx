import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import type { Barber } from "@/types/database";
import { SectionHeading } from "./section-heading";
import { Reveal } from "./reveal";

export function BarbersPreview({ barbers }: { barbers: Barber[] }) {
  return (
    <section className="bg-charcoal">
      <div className="mx-auto max-w-7xl px-6 py-24 lg:px-12 lg:py-32">
        <SectionHeading eyebrow="Ekibimiz" title="Berberlerimiz" description="Randevu adımlarında berberinizi siz seçersiniz." />

        <Reveal stagger={0.1} className="mt-14 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {barbers.map((barber) => (
            <Link
              key={barber.id}
              href="/berberler"
              className="group block overflow-hidden rounded-md border border-border bg-ink transition-colors hover:border-gold/40"
            >
              <div className="relative aspect-[4/5] overflow-hidden bg-surface-raised">
                {barber.photo_url ? (
                  <Image
                    src={barber.photo_url}
                    alt={barber.name}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <span className="font-display text-6xl text-gold/25">
                      {barber.name.charAt(0)}
                    </span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-ink via-transparent to-transparent" />
              </div>
              <div className="p-6">
                <h3 className="font-display text-xl text-warm-white">{barber.name}</h3>
                {barber.specialty && <p className="mt-1 text-sm text-gold-bright">{barber.specialty}</p>}
                {barber.bio && <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-ash">{barber.bio}</p>}
                <span className="label-caps mt-5 inline-flex items-center gap-1.5 text-[0.62rem] text-ash transition-colors group-hover:text-gold">
                  Profili Gör <ArrowUpRight className="size-3" />
                </span>
              </div>
            </Link>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
