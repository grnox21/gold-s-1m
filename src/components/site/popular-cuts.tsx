import { Scissors, Wand2, Droplets } from "lucide-react";

import type { Service } from "@/types/database";
import { SectionHeading } from "./section-heading";
import { Reveal } from "./reveal";

interface DisplayItem {
  id: string;
  icon: typeof Scissors;
  name: string;
  description?: string | null;
}

/** "Popular" here leans on the shop's own first two active services (real
 * data the owner already entered in Hizmetler) for the first two cards —
 * not invented style names. The third slot is a fixed "Cilt Bakım
 * Maskesi" entry rather than whatever the third active service happens
 * to be (that was "Saç + Sakal", a combo of the first two — redundant
 * next to them, not a third distinct thing to show off). An empty photo
 * slot per card is ready for a real customer/treatment photo later
 * rather than a stock image standing in for one. */
export function PopularCuts({ services }: { services: Service[] }) {
  const items: DisplayItem[] = [
    ...services.slice(0, 2).map((s, i) => ({
      id: s.id,
      icon: i === 0 ? Scissors : Wand2,
      name: s.name,
      description: s.description,
    })),
    {
      id: "mask",
      icon: Droplets,
      name: "Cilt Bakım Maskesi",
      description: "Tıraş sonrası ferahlatıcı, arındırıcı cilt bakımı.",
    },
  ];

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
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.id} className="group overflow-hidden rounded-md border border-border-strong bg-ink">
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
                  <h3 className="font-display text-xl text-warm-white">{item.name}</h3>
                  {item.description && (
                    <p className="mt-2 text-sm leading-relaxed text-ash">{item.description}</p>
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
