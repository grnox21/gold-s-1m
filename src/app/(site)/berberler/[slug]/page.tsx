import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { PageHeader } from "@/components/site/page-header";
import { Button } from "@/components/ui/button";
import { getBarberBySlug } from "@/lib/site-data";
import { listBarberPhotoUrls } from "@/lib/barber-photos";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const barber = await getBarberBySlug(slug);
  if (!barber) return {};
  return {
    title: barber.name,
    description: barber.bio ?? `${barber.name} — Yusuf Demir Erkek Kuaförü.`,
  };
}

export default async function BarberProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const barber = await getBarberBySlug(slug);
  if (!barber) notFound();

  const photos = await listBarberPhotoUrls(barber.id);

  return (
    <>
      <PageHeader eyebrow={barber.specialty ?? "Berber"} title={barber.name} description={barber.bio ?? undefined} />

      <section className="bg-ink">
        <div className="mx-auto max-w-6xl px-6 py-16 lg:px-12 lg:py-20">
          <Link
            href="/berberler"
            className="label-caps inline-flex items-center gap-1.5 text-[0.66rem] text-ash transition-colors hover:text-gold"
          >
            <ArrowLeft className="size-3.5" /> Tüm Berberler
          </Link>

          <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,22rem)_1fr] lg:gap-16">
            <div>
              <div className="relative aspect-[4/5] overflow-hidden rounded-md border border-border bg-surface-raised">
                {barber.photo_url ? (
                  <Image src={barber.photo_url} alt={barber.name} fill className="object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <span className="font-display text-8xl text-gold/20">{barber.name.charAt(0)}</span>
                  </div>
                )}
              </div>
              <Button asChild className="mt-6 w-full">
                <Link href="/randevu">{barber.name.split(" ")[0]}&apos;den Randevu Al</Link>
              </Button>
            </div>

            <div>
              <p className="label-caps mb-5 text-[0.66rem] text-gold">Çalışmaları</p>
              {photos.length > 0 ? (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  {photos.map((src) => (
                    <div key={src} className="relative aspect-square overflow-hidden rounded-md border border-border">
                      <Image src={src} alt={barber.name} fill className="object-cover" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex aspect-[21/9] items-center justify-center rounded-md border border-dashed border-border-strong">
                  <p className="label-caps max-w-xs text-center text-[0.66rem] text-ash">Fotoğraflar yakında eklenecek</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
