import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { PageHeader } from "@/components/site/page-header";
import { Button } from "@/components/ui/button";
import { getActiveBarbers } from "@/lib/site-data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Berberlerimiz",
  description: "Yusuf Demir Erkek Kuaförü berberleriyle tanışın ve randevu adımlarında size uygun olanı seçin.",
};

export default async function BerberlerPage() {
  const barbers = await getActiveBarbers();

  return (
    <>
      <PageHeader
        eyebrow="Ekibimiz"
        title="Berberlerimiz"
        description="Her berberin kendi uzmanlık alanı ve çalışma saatleri vardır. Randevu adımlarında berberinizi siz seçersiniz."
      />

      <section className="bg-ink">
        <div className="mx-auto max-w-6xl px-6 py-20 lg:px-12 lg:py-28">
          <div className="space-y-24">
            {barbers.map((barber, i) => (
              <article
                key={barber.id}
                className={`grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16 ${i % 2 === 1 ? "lg:[&>*:first-child]:order-2" : ""}`}
              >
                <div className="relative aspect-[4/5] overflow-hidden rounded-md border border-border bg-surface-raised">
                  {barber.photo_url ? (
                    <Image src={barber.photo_url} alt={barber.name} fill className="object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <span className="font-display text-8xl text-gold/20">{barber.name.charAt(0)}</span>
                    </div>
                  )}
                </div>
                <div>
                  <p className="label-caps mb-3 text-[0.66rem] text-gold">{barber.specialty ?? "Berber"}</p>
                  <h2 className="font-display text-3xl text-warm-white sm:text-4xl">{barber.name}</h2>
                  {barber.bio && <p className="mt-5 max-w-md text-base leading-relaxed text-ash">{barber.bio}</p>}
                  <Button asChild className="mt-8">
                    <Link href="/randevu">{barber.name.split(" ")[0]}&apos;den Randevu Al</Link>
                  </Button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
