import Image from "next/image";
import Link from "next/link";

import { SectionHeading } from "./section-heading";
import { Reveal } from "./reveal";

export function InteriorSection({ images }: { images: string[] }) {
  const shown = images.slice(0, 3);

  return (
    <section className="bg-ink">
      <div className="mx-auto max-w-7xl px-6 py-24 lg:px-12 lg:py-32">
        <div className="flex flex-col items-start justify-between gap-8 sm:flex-row sm:items-end">
          <SectionHeading eyebrow="Galeri" title="Çalışmalarımız" />
          <Link href="/galeri" className="label-caps text-[0.66rem] text-ash transition-colors hover:text-gold">
            Galeriyi Gör →
          </Link>
        </div>

        {shown.length > 0 ? (
          <Reveal stagger={0.1} className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {shown.map((src, i) => (
              <div
                key={src}
                className={`relative overflow-hidden rounded-md border border-border ${i === 0 ? "sm:col-span-2 sm:row-span-2 aspect-[4/3]" : "aspect-square"}`}
              >
                <Image src={src} alt="Yusuf Demir Erkek Kuaförü" fill className="object-cover" />
              </div>
            ))}
          </Reveal>
        ) : (
          <div className="mt-14 flex aspect-[21/9] items-center justify-center rounded-md border border-dashed border-border-strong">
            <p className="label-caps text-[0.66rem] text-ash">Salon fotoğrafları admin panelinden eklenecek</p>
          </div>
        )}
      </div>
    </section>
  );
}
