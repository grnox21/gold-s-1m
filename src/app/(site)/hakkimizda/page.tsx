import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { PageHeader } from "@/components/site/page-header";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/site/reveal";
import { listGalleryImageUrls } from "@/lib/gallery-storage";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Hakkımızda",
  description: "Yusuf Demir Erkek Kuaförü'nün hikayesi: özenli zanaat, kişiye özel bakım ve modern bir atmosfer.",
};

export default async function HakkimizdaPage() {
  const [photo] = await listGalleryImageUrls("about");

  return (
    <>
      <PageHeader eyebrow="Hikayemiz" title="Hakkımızda" />

      <section className="bg-ink">
        <div className="mx-auto max-w-5xl px-6 py-20 lg:px-12 lg:py-28">
          <div className="grid grid-cols-1 gap-14 lg:grid-cols-[1.1fr_1fr] lg:items-center">
            <Reveal className="space-y-7">
              <div className="h-px w-14 bg-gold" />
              <p className="font-display text-2xl leading-relaxed text-warm-white sm:text-[1.65rem]">
                Yusuf Demir Erkek Kuaförü, klasik berberlik zanaatını modern bir bakım anlayışıyla bir araya
                getirmek fikriyle kuruldu. Amacımız her müşteriye telaşsız, özenli ve kişiye özel bir bakım
                deneyimi sunmak.
              </p>
              <p className="text-base leading-relaxed text-ash">
                Saç kesiminden sakal tıraşına, her hizmeti tek tek ele alıyor; kullandığımız ürünlerden
                çalışma ortamımıza kadar her detayı bu anlayışla şekillendiriyoruz. Randevu sistemimiz
                sayesinde bekleme yaşamadan, size ayrılan zamanda tam odaklanmış bir hizmet alırsınız.
              </p>
              <p className="text-base leading-relaxed text-ash">
                Mermer detaylar, sıcak aydınlatma ve özel istasyonlarla tasarlanan salonumuz, günlük
                telaştan uzak, sakin bir bakım anı yaşamanız için düşünüldü.
              </p>
              <Button asChild size="lg" className="mt-4">
                <Link href="/randevu">Randevu Al</Link>
              </Button>
            </Reveal>

            <Reveal className="relative">
              {/* Offset frame behind the photo — a common premium-editorial
                  device (Dolce & Gabbana / high-end hospitality sites lean
                  on this) that reads as considered art direction rather
                  than a plain cropped image. */}
              <div className="absolute -bottom-4 -right-4 hidden aspect-[4/5] w-full rounded-md border border-gold/30 sm:block" />
              <div className="relative aspect-[4/5] overflow-hidden rounded-md border border-border">
                {photo ? (
                  <Image src={photo} alt="Yusuf Demir Erkek Kuaförü" fill className="object-cover" />
                ) : (
                  <div
                    className="h-full w-full"
                    style={{
                      background:
                        "radial-gradient(70% 60% at 70% 20%, rgba(201,162,75,0.14), transparent 60%), linear-gradient(160deg, #1a1815, #0e0d0b)",
                    }}
                  />
                )}
              </div>
            </Reveal>
          </div>
        </div>
      </section>
    </>
  );
}
