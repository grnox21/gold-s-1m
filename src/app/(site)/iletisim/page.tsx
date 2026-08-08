import type { Metadata } from "next";
import Link from "next/link";
import { Clock, MapPin, MessageCircle, Phone } from "lucide-react";

import { PageHeader } from "@/components/site/page-header";
import { Button } from "@/components/ui/button";
import { InstagramIcon } from "@/components/site/icons";
import { getSiteSettings } from "@/lib/site-data";
import { waLink } from "@/lib/booking/phone";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "İletişim",
  description: "Yusuf Demir Erkek Kuaförü adres, telefon ve çalışma saatleri.",
};

export default async function IletisimPage() {
  const settings = await getSiteSettings();

  const items = [
    { icon: MapPin, label: "Adres", value: settings.address, href: undefined },
    { icon: Phone, label: "Telefon", value: settings.phone, href: `tel:${settings.phone}` },
    {
      icon: MessageCircle,
      label: "WhatsApp",
      value: settings.whatsapp_display_number,
      href: waLink(settings.whatsapp_display_number, "Merhaba, randevu hakkında bilgi almak istiyorum."),
    },
    { icon: Clock, label: "Çalışma Saatleri", value: settings.opening_hours_note, href: undefined },
  ];

  return (
    <>
      <PageHeader eyebrow="İletişim" title="Bize Ulaşın" />

      <section className="bg-ink">
        <div className="mx-auto max-w-6xl px-6 py-20 lg:px-12 lg:py-28">
          <div className="grid grid-cols-1 gap-16 lg:grid-cols-[1fr_1.1fr]">
            <div>
              <ul className="space-y-8">
                {items.map((item) => (
                  <li key={item.label} className="flex items-start gap-4">
                    <item.icon className="mt-1 size-5 shrink-0 text-gold" strokeWidth={1.4} />
                    <div>
                      <p className="label-caps text-[0.62rem] text-ash">{item.label}</p>
                      {item.href ? (
                        <a href={item.href} target={item.href.startsWith("http") ? "_blank" : undefined} rel="noreferrer" className="mt-1 block text-lg text-warm-white transition-colors hover:text-gold">
                          {item.value}
                        </a>
                      ) : (
                        <p className="mt-1 text-lg text-warm-white">{item.value}</p>
                      )}
                    </div>
                  </li>
                ))}
                {settings.instagram_url && (
                  <li className="flex items-start gap-4">
                    <InstagramIcon className="mt-1 size-5 shrink-0 text-gold" />
                    <div>
                      <p className="label-caps text-[0.62rem] text-ash">Instagram</p>
                      <a href={settings.instagram_url} target="_blank" rel="noreferrer" className="mt-1 block text-lg text-warm-white transition-colors hover:text-gold">
                        @yusufdemirkuafor
                      </a>
                    </div>
                  </li>
                )}
              </ul>

              <div className="mt-14 rounded-md border border-border bg-charcoal p-8">
                <h2 className="font-display text-2xl text-warm-white">Randevunuzu Şimdi Alın</h2>
                <p className="mt-3 text-sm leading-relaxed text-ash">
                  Berberinizi ve size uygun saati birkaç adımda seçin.
                </p>
                <Button asChild size="lg" className="mt-6">
                  <Link href="/randevu">Randevu Al</Link>
                </Button>
              </div>
            </div>

            <div className="relative aspect-square overflow-hidden rounded-md border border-border lg:aspect-auto">
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
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
