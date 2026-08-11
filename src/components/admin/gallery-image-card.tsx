"use client";

import { useState } from "react";
import Image from "next/image";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { deleteGalleryImage } from "@/app/giris/(protected)/gorseller/actions";
import type { GalleryImage } from "@/lib/gallery-storage";

export function GalleryImageCard({ image }: { image: GalleryImage }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    const result = await deleteGalleryImage(image.path);
    setDeleting(false);
    if (!result.ok) {
      toast.error(result.error ?? "Silinemedi.");
      return;
    }
    toast.success("Görsel silindi.");
    setConfirmOpen(false);
  }

  return (
    <div className="group relative overflow-hidden rounded-md border border-border">
      <Image
        src={image.url}
        alt=""
        width={400}
        height={400}
        className="aspect-square w-full object-cover"
      />
      <Button
        type="button"
        variant="destructive"
        size="icon"
        className="absolute right-2 top-2 size-8 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
        onClick={() => setConfirmOpen(true)}
        aria-label="Görseli sil"
      >
        <Trash2 className="size-3.5" />
      </Button>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Görsel silinsin mi?</DialogTitle>
            <DialogDescription>
              Bu görsel sitedeki tüm sayfalardan (Ana Sayfa, Galeri, Hakkımızda) kaldırılacak. Bu işlem geri
              alınamaz.
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
