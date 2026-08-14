"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { Trash2, Video } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { deleteGalleryImage, updateGalleryImagePlacements } from "@/app/giris/(protected)/gorseller/actions";
import type { GalleryImage } from "@/lib/gallery-storage";

const PLACEMENT_OPTIONS = [
  { key: "showGallery", label: "Galeri" },
  { key: "showAbout", label: "Hakkımızda" },
] as const;

export function GalleryImageCard({ image, canDelete }: { image: GalleryImage; canDelete: boolean }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [placements, setPlacements] = useState({
    showGallery: image.showGallery,
    showAbout: image.showAbout,
  });
  const [isPending, startTransition] = useTransition();
  const isVideo = image.mediaType === "video";

  function togglePlacement(key: keyof typeof placements, checked: boolean) {
    const next = { ...placements, [key]: checked };
    setPlacements(next); // optimistic — feels instant, matches a checkbox's expected behavior
    startTransition(async () => {
      const result = await updateGalleryImagePlacements(image.id, next);
      if (!result.ok) {
        setPlacements(placements); // roll back
        toast.error(result.error ?? "Güncellenemedi.");
      }
    });
  }

  async function handleDelete() {
    setDeleting(true);
    const result = await deleteGalleryImage(image.id);
    setDeleting(false);
    if (!result.ok) {
      toast.error(result.error ?? "Silinemedi.");
      return;
    }
    toast.success(isVideo ? "Video silindi." : "Görsel silindi.");
    setConfirmOpen(false);
  }

  return (
    <div className="overflow-hidden rounded-md border border-border">
      <div className="group relative">
        {isVideo ? (
          <video src={image.url} controls playsInline muted className="aspect-square w-full bg-ink object-cover" />
        ) : (
          <Image src={image.url} alt="" width={400} height={400} className="aspect-square w-full object-cover" />
        )}
        {isVideo && (
          <span className="pointer-events-none absolute left-2 top-2 flex items-center gap-1 rounded-full bg-ink/80 px-2 py-1 text-[0.6rem] text-warm-white">
            <Video className="size-3" /> Video
          </span>
        )}
        {canDelete && (
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute right-2 top-2 size-8 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
            onClick={() => setConfirmOpen(true)}
            aria-label={isVideo ? "Videoyu sil" : "Görseli sil"}
          >
            <Trash2 className="size-3.5" />
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-x-3 gap-y-1.5 border-t border-border px-3 py-2.5">
        {PLACEMENT_OPTIONS
          // A video is Galeri-only — the server already refuses to save
          // show_about=true for one (see updateGalleryImagePlacements,
          // lib/gallery-storage.ts), so don't even offer a checkbox that
          // would silently no-op.
          .filter((opt) => !isVideo || opt.key !== "showAbout")
          .map((opt) => (
            <label key={opt.key} className="flex items-center gap-1.5 text-xs text-ash">
              <Checkbox
                checked={placements[opt.key]}
                disabled={isPending}
                onCheckedChange={(checked) => togglePlacement(opt.key, checked === true)}
              />
              {opt.label}
            </label>
          ))}
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isVideo ? "Video silinsin mi?" : "Görsel silinsin mi?"}</DialogTitle>
            <DialogDescription>
              Bu {isVideo ? "video" : "görsel"} gösterildiği tüm sayfalardan kaldırılacak. Bu işlem geri alınamaz.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Vazgeç</Button>
            </DialogClose>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Siliniyor…" : "Evet, Sil"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
