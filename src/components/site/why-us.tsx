import { CalendarCheck, Gem, UserCheck, Sparkles } from "lucide-react";

import { SectionHeading } from "./section-heading";
import { Reveal } from "./reveal";

const REASONS = [
  {
    icon: CalendarCheck,
    title: "Randevulu, beklemesiz",
    description: "Online randevu sistemiyle saatinizi ve berberinizi siz belirlersiniz — sıra beklemeden.",
  },
  {
    icon: UserCheck,
    title: "Berberinizi siz seçersiniz",
    description: "Her berberin kendi uzmanlık alanı vardır; size uygun olanı randevu adımlarında seçin.",
  },
  {
    icon: Gem,
    title: "Özenli, sakin bir ortam",
    description: "Mermer detaylar, sıcak aydınlatma ve özel istasyonlarla konforlu bir bakım deneyimi.",
  },
  {
    icon: Sparkles,
    title: "Kişiye özel bakım",
    description: "Her hizmet, saç ve sakal yapınıza göre kişiselleştirilir.",
  },
];

export function WhyUs() {
  return (
    <section className="section-marble">
      <div className="mx-auto max-w-7xl px-6 py-24 lg:px-12 lg:py-32">
        <SectionHeading title="Neden Yusuf Demir" align="center" tone="light" className="mx-auto" />

        <Reveal stagger={0.08} className="mt-16 grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {REASONS.map((reason) => (
            <div key={reason.title} className="text-center sm:text-left">
              <reason.icon className="mx-auto size-6 text-gold-deep sm:mx-0" strokeWidth={1.4} />
              <h3 className="mt-5 font-display text-lg text-ink">{reason.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink/65">{reason.description}</p>
            </div>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
