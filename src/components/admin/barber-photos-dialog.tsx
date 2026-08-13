"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { uploadBarberWorkPhoto, deleteBarberWorkPhoto } from "@/app/giris/(protected)/berberler/actions";
import { MAX_GALLERY_IMAGE_BYTES } from "@/lib/gallery-constants";
import type { Barber } from "@/types/database";
import type { BarberPhoto } from "@/lib/barber-photos";

/** Manages one barber's "works" gallery — the photos shown on their public
 * profile page (/berberler/[slug]), separate from the single headshot
 * BarberFormDialog manages. `photos` comes preloaded from the parent
 * Server Component's single grouped query (listBarberPhotosGrouped() in
 * lib/barber-photos.ts), so opening the dialog needs no round trip of its
 * own — only add/remove do. */
export function BarberPhotosDialog({
  barber,
  photos: initialPhotos,
  trigger,
}: {
  barber: Barber;
  photos: BarberPhoto[];
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [photos, setPhotos] = useState(initialPhotos);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);

    // Sequential on purpose — same reasoning as GalleryUploadForm: keeps
    // each file's toast (and any failure) attributable to it alone.
    for (const file of Array.from(files)) {
      if (file.size > MAX_GALLERY_IMAGE_BYTES) {
        toast.error(`${file.name}: Görsel çok büyük — en fazla ${Math.floor(MAX_GALLERY_IMAGE_BYTES / (1024 * 1024))}MB olabilir.`);
        continue;
      }

      const formData = new FormData();
      formData.set("file", file);

      try {
        const result = await uploadBarberWorkPhoto(barber.id, formData);
        if (result.ok) {
          setPhotos((prev) => [result.photo, ...prev]);
        } else {
          toast.error(`${file.name}: ${result.error ?? "Yüklenemedi."}`);
        }
      } catch {
        // A thrown error here (network drop, a stale deploy's Server
        // Action id no longer existing, etc.) must never leave the button
        // stuck on "Yükleniyor…" with no explanation.
        toast.error(`${file.name}: Bağlantı hatası — tekrar deneyin.`);
      }
    }

    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    const result = await deleteBarberWorkPhoto(id);
    setDeletingId(null);
    if (!result.ok) {
      toast.error(result.error ?? "Silinemedi.");
      return;
    }
    setPhotos((prev) => prev.filter((p) => p.id !== id));
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{barber.name} — Çalışmaları</DialogTitle>
          <DialogDescription>
            Bu fotoğraflar {barber.name.split(" ")[0]}&apos;in /berberler/{barber.slug} sayfasında gösterilir.
          </DialogDescription>
        </DialogHeader>

        <div>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
          <Button type="button" size="sm" variant="outline" disabled={uploading} onClick={() => inputRef.current?.click()}>
            <Upload className="size-3.5" /> {uploading ? "Yükleniyor…" : "Fotoğraf Ekle"}
          </Button>
        </div>

        {photos.length > 0 ? (
          <div className="grid grid-cols-3 gap-3">
            {photos.map((photo) => (
              <div key={photo.id} className="group relative overflow-hidden rounded-md border border-border">
                <Image src={photo.url} alt="" width={200} height={200} className="aspect-square w-full object-cover" />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute right-1.5 top-1.5 size-7 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                  disabled={deletingId === photo.id}
                  onClick={() => handleDelete(photo.id)}
                  aria-label="Fotoğrafı sil"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex aspect-[21/9] items-center justify-center rounded-md border border-dashed border-border-strong">
            <p className="label-caps max-w-xs text-center text-[0.66rem] text-ash">
              Henüz fotoğraf yok — &quot;Fotoğraf Ekle&quot; ile başlayın
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
