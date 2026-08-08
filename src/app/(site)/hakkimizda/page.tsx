import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { PageHeader } from "@/components/site/page-header";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/site/reveal";
import { listGalleryImages } from "@/lib/brand-assets";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Hakkımızda",
  description: "Yusuf Demir Erkek Kuaförü'nün hikayesi: özenli zanaat, kişiye özel bakım ve modern bir atmosfer.",
};

export default function HakkimizdaPage() {
  const [photo] = listGalleryImages();

  return (
    <>
      <PageHeader eyebrow="Hikayemiz" title="Hakkımızda" />

      <section className="bg-ink">
        <div className="mx-auto max-w-5xl px-6 py-20 lg:px-12 lg:py-28">
          <div className="grid grid-cols-1 gap-14 lg:grid-cols-[1.1fr_1fr] lg:items-center">
            <Reveal className="space-y-6 text-base leading-relaxed text-ash">
              <p>
                Yusuf Demir Erkek Kuaförü, klasik berberlik zanaatını modern bir bakım anlayışıyla bir araya
                getirmek fikriyle kuruldu. Amacımız her müşteriye telaşsız, özenli ve kişiye özel bir bakım
                deneyimi sunmak.
              </p>
              <p>
                Saç kesiminden sakal tıraşına, her hizmeti tek tek ele alıyor; kullandığımız ürünlerden
                çalışma ortamımıza kadar her detayı bu anlayışla şekillendiriyoruz. Randevu sistemimiz
                sayesinde bekleme yaşamadan, size ayrılan zamanda tam odaklanmış bir hizmet alırsınız.
              </p>
              <p>
                Mermer detaylar, sıcak aydınlatma ve özel istasyonlarla tasarlanan salonumuz, günlük
                telaştan uzak, sakin bir bakım anı yaşamanız için düşünüldü.
              </p>
              <Button asChild size="lg" className="mt-4">
                <Link href="/randevu">Randevu Al</Link>
              </Button>
            </Reveal>

            <Reveal className="relative aspect-[4/5] overflow-hidden rounded-md border border-border">
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
            </Reveal>
          </div>
        </div>
      </section>
    </>
  );
}
