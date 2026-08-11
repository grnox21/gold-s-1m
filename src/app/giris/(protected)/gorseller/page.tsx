import type { Metadata } from "next";

import { requireFullAdmin } from "@/lib/auth/admin";
import { listGalleryImages } from "@/lib/gallery-storage";
import { AdminPageHeading } from "@/components/admin/page-heading";
import { GalleryUploadForm } from "@/components/admin/gallery-upload-form";
import { GalleryImageCard } from "@/components/admin/gallery-image-card";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Görseller" };

export default async function AdminGalleryPage() {
  const { admin } = await requireFullAdmin();
  const images = await listGalleryImages();
  const isOwner = admin.role === "owner";

  return (
    <div>
      <AdminPageHeading
        title="Görseller"
        description="Her görselin altındaki kutucuklarla hangi sayfada göründüğünü tek tek seçin — Ana Sayfa, Galeri, Hakkımızda."
        action={<GalleryUploadForm />}
      />

      {images.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {images.map((image) => (
            <GalleryImageCard key={image.id} image={image} canDelete={isOwner} />
          ))}
        </div>
      ) : (
        <div className="flex aspect-[21/9] items-center justify-center rounded-md border border-dashed border-border-strong">
          <p className="label-caps max-w-xs text-center text-[0.66rem] text-ash">
            Henüz görsel yok — &quot;Görsel Yükle&quot; ile ekleyin
          </p>
        </div>
      )}
    </div>
  );
}
