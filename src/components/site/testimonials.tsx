import { Star } from "lucide-react";

import { SectionHeading } from "./section-heading";
import { Reveal } from "./reveal";

/** Real quotes from real customers, provided by the shop owner — not
 * invented here. See the git history on this file for the earlier
 * placeholder version and why fabricating testimonials was refused. */
const REVIEWS = [
  {
    name: "Mert Yılmaz",
    quote:
      "Uzun zamandır saçımı bu kadar özenli kestiren bir yer bulamamıştım. Yusuf Bey önce nasıl bir görünüm istediğimi dinledi, sonra yüz hatlarıma uygun küçük dokunuşlarla sonucu gerçekten başka bir seviyeye taşıdı. Özellikle geçişler ve detaylardaki titizlik çok başarılı.",
  },
  {
    name: "Burak Aydın",
    quote:
      "Sadece saç kesimi değil, baştan sona kaliteli bir deneyim. Mekân çok temiz ve şık, kullanılan ürünlerden yapılan işe kadar her detay özenli. Saç ve sakal birlikte yaptırdım; sonuç tam istediğim gibi, doğal ve çok düzgün oldu.",
  },
  {
    name: "Emre Karaca",
    quote:
      "İlk kez geldim ve kesinlikle son olmayacak. Acele etmeden, gerçekten detaylara önem vererek çalışıyorlar. Sakal çizgileri ve saç kesimi özellikle çok temizdi. Kendine özen gösteren ve kaliteli iş arayan herkese rahatlıkla tavsiye ederim.",
  },
];

export function Testimonials({ googleMapsUrl }: { googleMapsUrl: string }) {
  return (
    <section className="bg-charcoal">
      <div className="mx-auto max-w-7xl px-6 py-24 lg:px-12 lg:py-32">
        <SectionHeading eyebrow="Değerlendirmeler" title="Misafirlerimiz Ne Diyor?" align="center" className="mx-auto" />

        <Reveal stagger={0.1} className="mt-16 grid grid-cols-1 gap-8 lg:grid-cols-3">
          {REVIEWS.map((review) => (
            <div
              key={review.name}
              className="flex flex-col rounded-md border border-border bg-ink p-8 transition-[transform,box-shadow,border-color] duration-500 ease-out hover:-translate-y-1.5 hover:border-gold/30 hover:shadow-[0_24px_40px_-24px_rgba(0,0,0,0.6)]"
            >
              <div className="flex gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="size-3.5 text-gold" fill="currentColor" strokeWidth={0} />
                ))}
              </div>
              <p className="mt-6 flex-1 text-sm leading-relaxed text-warm-white/85">&ldquo;{review.quote}&rdquo;</p>
              <div className="mt-8 flex items-center gap-3 border-t border-border pt-6">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-raised">
                  <span className="font-display text-lg text-gold">{review.name.charAt(0)}</span>
                </div>
                <div>
                  <p className="text-sm text-warm-white">{review.name}</p>
                  <p className="label-caps text-[0.6rem] text-ash">Müşteri Yorumu</p>
                </div>
              </div>
            </div>
          ))}
        </Reveal>

        {googleMapsUrl && (
          <div className="mt-14 text-center">
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noreferrer"
              className="label-caps text-[0.66rem] text-gold transition-colors hover:text-gold-bright"
            >
              Google&apos;da Değerlendir →
            </a>
          </div>
        )}
      </div>
    </section>
  );
}
