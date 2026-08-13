import { Star } from "lucide-react";

import { SectionHeading } from "./section-heading";
import { Reveal } from "./reveal";

/** No reviews are fabricated here — this section is an honest placeholder
 * until real Google/Instagram reviews are linked in from Site Ayarları.
 * Swap in real quotes once they exist, rather than inventing testimonials
 * attributed to people who never wrote them. */
export function Testimonials({ googleMapsUrl }: { googleMapsUrl: string }) {
  return (
    <section className="bg-charcoal">
      <div className="mx-auto max-w-3xl px-6 py-24 text-center lg:py-32">
        <Reveal>
          <SectionHeading eyebrow="Değerlendirmeler" title="Misafirlerimiz Ne Diyor?" align="center" className="mx-auto" />
          <div className="mt-8 flex justify-center gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className="size-4 text-gold/40" fill="currentColor" strokeWidth={0} />
            ))}
          </div>
          <p className="mx-auto mt-6 max-w-md text-sm leading-relaxed text-ash">
            Google üzerindeki gerçek değerlendirmelerimiz yayına alındığında bu alanda yer alacak.
          </p>
          {googleMapsUrl && (
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noreferrer"
              className="label-caps mt-6 inline-block text-[0.66rem] text-gold transition-colors hover:text-gold-bright"
            >
              Google&apos;da Değerlendir →
            </a>
          )}
        </Reveal>
      </div>
    </section>
  );
}
