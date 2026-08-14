import type { Metadata } from "next";
import Image from "next/image";

import { PageHeader } from "@/components/site/page-header";
import { listGalleryMedia } from "@/lib/gallery-storage";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Galeri",
  description: "Yusuf Demir Erkek Kuaförü salonundan kareler.",
};

export default async function GaleriPage() {
  const items = await listGalleryMedia("gallery");

  return (
    <>
      <PageHeader eyebrow="Galeri" title="Salonumuzdan Kareler" />

      <section className="bg-ink">
        <div className="mx-auto max-w-7xl px-6 py-20 lg:px-12 lg:py-28">
          {items.length > 0 ? (
            <div className="columns-1 gap-4 sm:columns-2 lg:columns-3 [&>*]:mb-4">
              {items.map((item) =>
                item.mediaType === "video" ? (
                  <div key={item.url} className="overflow-hidden rounded-md border border-border">
                    <video src={item.url} controls playsInline muted className="h-auto w-full bg-ink" />
                  </div>
                ) : (
                  <div key={item.url} className="overflow-hidden rounded-md border border-border">
                    <Image
                      src={item.url}
                      alt="Yusuf Demir Erkek Kuaförü"
                      width={800}
                      height={1000}
                      className="h-auto w-full object-cover"
                    />
                  </div>
                )
              )}
            </div>
          ) : (
            <div className="flex aspect-[21/9] items-center justify-center rounded-md border border-dashed border-border-strong">
              <p className="label-caps max-w-xs text-center text-[0.66rem] text-ash">
                Salon fotoğrafları admin panelinden eklenecek
              </p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
