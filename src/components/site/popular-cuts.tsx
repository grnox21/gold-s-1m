import Image from "next/image";
import { Scissors, Wand2, Droplets } from "lucide-react";

import type { Service } from "@/types/database";
import { SectionHeading } from "./section-heading";
import { Reveal } from "./reveal";

interface DisplayItem {
  id: string;
  icon: typeof Scissors;
  image: string;
  name: string;
  description?: string | null;
}

/** "Popular" here leans on the shop's own first two active services (real
 * data the owner already entered in Hizmetler) for the first two cards —
 * not invented style names. The third slot is a fixed "Cilt Bakım
 * Maskesi" entry rather than whatever the third active service happens
 * to be (that was "Saç + Sakal", a combo of the first two — redundant
 * next to them, not a third distinct thing to show off).
 *
 * Photos are a one-time drop-in like the hero images, matched by
 * position (see public/popular-cuts/README.md): first card is assumed
 * to be a haircut, second a beard trim, third the mask — same
 * assumption the icons already made before real photos existed. */
export function PopularCuts({ services }: { services: Service[] }) {
  const items: DisplayItem[] = [
    ...services.slice(0, 2).map((s, i) => ({
      id: s.id,
      icon: i === 0 ? Scissors : Wand2,
      image: i === 0 ? "/popular-cuts/hair.webp" : "/popular-cuts/beard.webp",
      name: s.name,
      description: s.description,
    })),
    {
      id: "mask",
      icon: Droplets,
      image: "/popular-cuts/mask.webp",
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
              <div
                key={item.id}
                className="group overflow-hidden rounded-md border border-border-strong bg-ink transition-[transform,box-shadow,border-color] duration-500 ease-out hover:-translate-y-2 hover:border-gold/40 hover:shadow-[0_28px_48px_-24px_rgba(0,0,0,0.65)]"
              >
                <div className="relative aspect-[3/4] overflow-hidden bg-surface">
                  <Image
                    src={item.image}
                    alt=""
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/10 to-transparent" />
                  <div className="absolute left-4 top-4 flex size-9 items-center justify-center rounded-full border border-gold/30 bg-ink/70 backdrop-blur-sm">
                    <Icon className="size-4 text-gold" strokeWidth={1.4} />
                  </div>
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
