import { Clock, MapPin, Phone } from "lucide-react";

import type { SiteSettingsMap } from "@/lib/site-data";
import { SectionHeading } from "./section-heading";
import { Reveal } from "./reveal";

export function LocationSection({ settings }: { settings: SiteSettingsMap }) {
  return (
    <section className="bg-ink">
      <div className="mx-auto max-w-7xl px-6 py-24 lg:px-12 lg:py-32">
        <div className="grid grid-cols-1 gap-14 lg:grid-cols-2 lg:items-center">
          <Reveal>
            <SectionHeading
              eyebrow="Konum"
              title="Bize Ulaşın"
              description="Adres, çalışma saatleri ve randevu için bir tık uzağınızdayız."
            />
            <ul className="mt-10 space-y-6">
              <li className="flex items-start gap-4">
                <MapPin className="mt-0.5 size-5 shrink-0 text-gold" strokeWidth={1.4} />
                <span className="text-sm leading-relaxed text-warm-white/85">{settings.address}</span>
              </li>
              <li className="flex items-start gap-4">
                <Clock className="mt-0.5 size-5 shrink-0 text-gold" strokeWidth={1.4} />
                <span className="text-sm leading-relaxed text-warm-white/85">{settings.opening_hours_note}</span>
              </li>
              <li className="flex items-start gap-4">
                <Phone className="mt-0.5 size-5 shrink-0 text-gold" strokeWidth={1.4} />
                <a href={`tel:${settings.phone}`} className="text-sm text-warm-white/85 transition-colors hover:text-gold">
                  {settings.phone}
                </a>
              </li>
            </ul>
          </Reveal>

          <Reveal className="relative aspect-[4/3] overflow-hidden rounded-md border border-border">
            {settings.google_maps_url ? (
              <iframe
                src={settings.google_maps_url}
                title="Yusuf Demir Erkek Kuaförü Konum"
                className="h-full w-full"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            ) : (
              <div className="flex h-full items-center justify-center bg-surface">
                <p className="label-caps text-[0.66rem] text-ash">Harita admin panelinden eklenecek</p>
              </div>
            )}
          </Reveal>
        </div>
      </div>
    </section>
  );
}
