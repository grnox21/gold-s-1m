import { Scissors, Sparkles, Wand2 } from "lucide-react";

import type { Service } from "@/types/database";
import { SectionHeading } from "./section-heading";
import { Reveal } from "./reveal";

// Cycled by index rather than stored per-service — there's no icon field
// on the services table, and three neutral, unmistakably barbershop icons
// read fine rotating across whichever services happen to be first.
const ICONS = [Scissors, Wand2, Sparkles];

/** "Popular" here means the shop's own first three active services (real
 * data the owner already entered in Hizmetler), not invented style names
 * — an empty photo slot per card is ready for a real customer/haircut
 * photo later rather than a stock image standing in for one. */
export function PopularCuts({ services }: { services: Service[] }) {
  const featured = services.slice(0, 3);
  if (featured.length === 0) return null;

  return (
    <section className="section-marble">
      <div className="mx-auto max-w-7xl px-6 py-24 lg:px-12 lg:py-32">
        <SectionHeading
          eyebrow="Öne Çıkanlar"
          title="Popüler Kesimler"
          description="En çok tercih edilen hizmetlerimizden bir seçki."
          tone="light"
          align="center"
          className="mx-auto"
        />

        <Reveal stagger={0.1} className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-3">
          {featured.map((service, i) => {
            const Icon = ICONS[i % ICONS.length];
            return (
              <div key={service.id} className="group overflow-hidden rounded-md border border-border-strong bg-ink">
                <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden bg-surface">
                  <div
                    className="absolute inset-0"
                    style={{
                      background:
                        "radial-gradient(65% 55% at 75% 25%, rgba(201,162,75,0.14), transparent 60%), linear-gradient(160deg, #1a1815, #0e0d0b)",
                    }}
                  />
                  <Icon className="relative size-9 text-gold/70" strokeWidth={1.2} />
                </div>
                <div className="p-6">
                  <h3 className="font-display text-xl text-warm-white">{service.name}</h3>
                  {service.description && (
                    <p className="mt-2 text-sm leading-relaxed text-ash">{service.description}</p>
                  )}
                </div>
              </div>
            );
          })}
        </Reveal>
      </div>
    </section>
  );
}
