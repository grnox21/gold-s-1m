import Link from "next/link";
import { MapPin, MessageCircle, Phone } from "lucide-react";

import { Logo } from "./logo";
import { InstagramIcon } from "./icons";
import { navLogoSrc } from "@/lib/brand-assets";
import { getActiveBarbers, getActiveServices, getSiteSettings } from "@/lib/site-data";
import { waLink } from "@/lib/booking/phone";

export async function Footer() {
  const [barbers, services, settings] = await Promise.all([
    getActiveBarbers(),
    getActiveServices(),
    getSiteSettings(),
  ]);
  const logoSrc = navLogoSrc();

  return (
    <footer className="border-t border-border bg-ink">
      <div className="mx-auto max-w-7xl px-6 py-16 lg:px-12 lg:py-24">
        <div className="grid gap-12 lg:grid-cols-[1.3fr_1fr_1fr_1fr]">
          <div>
            <Logo src={logoSrc} />
            <p className="mt-6 max-w-xs text-sm leading-relaxed text-ash">
              Premium erkek kuaförü deneyimi — klasik zanaat, modern konfor. Randevunuzu online oluşturun,
              berberinizi siz seçin.
            </p>
            <div className="mt-6 flex items-center gap-4">
              {settings.instagram_url && (
                <a
                  href={settings.instagram_url}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Instagram"
                  className="flex size-9 items-center justify-center rounded-full border border-border-strong text-ash transition-colors hover:border-gold hover:text-gold"
                >
                  <InstagramIcon className="size-4" />
                </a>
              )}
              <a
                href={waLink(settings.whatsapp_display_number, "Merhaba, randevu hakkında bilgi almak istiyorum.")}
                target="_blank"
                rel="noreferrer"
                aria-label="WhatsApp"
                className="flex size-9 items-center justify-center rounded-full border border-border-strong text-ash transition-colors hover:border-gold hover:text-gold"
              >
                <MessageCircle className="size-4" />
              </a>
            </div>
          </div>

          <div>
            <h3 className="label-caps text-[0.66rem] text-gold">Site</h3>
            <ul className="mt-5 space-y-3 text-sm text-ash">
              {[
                ["Ana Sayfa", "/"],
                ["Hizmetler", "/hizmetler"],
                ["Berberlerimiz", "/berberler"],
                ["Hakkımızda", "/hakkimizda"],
                ["Galeri", "/galeri"],
                ["İletişim", "/iletisim"],
              ].map(([label, href]) => (
                <li key={href}>
                  <Link href={href} className="transition-colors hover:text-gold">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="label-caps text-[0.66rem] text-gold">Hizmetler</h3>
            <ul className="mt-5 space-y-3 text-sm text-ash">
              {services.slice(0, 6).map((s) => (
                <li key={s.id}>
                  <Link href="/hizmetler" className="transition-colors hover:text-gold">
                    {s.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="label-caps text-[0.66rem] text-gold">Berberlerimiz</h3>
            <ul className="mt-5 space-y-3 text-sm text-ash">
              {barbers.map((b) => (
                <li key={b.id}>
                  <Link href="/berberler" className="transition-colors hover:text-gold">
                    {b.name}
                  </Link>
                </li>
              ))}
            </ul>

            <h3 className="label-caps mt-8 text-[0.66rem] text-gold">İletişim</h3>
            <ul className="mt-5 space-y-3 text-sm text-ash">
              <li className="flex items-start gap-2">
                <MapPin className="mt-0.5 size-3.5 shrink-0 text-gold" />
                <span>{settings.address}</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="size-3.5 shrink-0 text-gold" />
                <a href={`tel:${settings.phone}`} className="transition-colors hover:text-gold">
                  {settings.phone}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-16 flex flex-col items-center justify-between gap-4 border-t border-border pt-8 text-xs text-ash sm:flex-row">
          <p>© {new Date().getFullYear()} Yusuf Demir Erkek Kuaförü. Tüm hakları saklıdır.</p>
          <p className="label-caps text-[0.6rem]">{settings.opening_hours_note}</p>
        </div>
      </div>
    </footer>
  );
}
