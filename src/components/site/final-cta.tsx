import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Reveal } from "./reveal";

export function FinalCta() {
  return (
    <section className="section-marble">
      <div className="mx-auto max-w-4xl px-6 py-24 text-center lg:py-32">
        <Reveal>
          <h2 className="font-display text-3xl text-ink sm:text-4xl lg:text-5xl">
            Sıranızı beklemeyin, randevunuzu şimdi alın.
          </h2>
          <p className="mx-auto mt-5 max-w-md text-base leading-relaxed text-ink/70">
            Berberinizi seçin, size uygun saati bulun — birkaç adımda randevunuz hazır.
          </p>
          <Button asChild size="lg" className="mt-9">
            <Link href="/randevu">Randevu Al</Link>
          </Button>
        </Reveal>
      </div>
    </section>
  );
}
