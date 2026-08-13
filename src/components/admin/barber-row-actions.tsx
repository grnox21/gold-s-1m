"use client";

import { useState } from "react";
import { Images, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { BarberFormDialog } from "./barber-form-dialog";
import { BarberPhotosDialog } from "./barber-photos-dialog";
import { deleteBarber } from "@/app/giris/(protected)/berberler/actions";
import type { Barber } from "@/types/database";
import type { BarberPhoto } from "@/lib/barber-photos";

export function BarberRowActions({ barber, photos }: { barber: Barber; photos: BarberPhoto[] }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    const result = await deleteBarber(barber.id);
    setDeleting(false);
    if (!result.ok) {
      toast.error(result.error ?? "Silinemedi.");
      return;
    }
    toast.success("Berber silindi.");
    setConfirmOpen(false);
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <BarberFormDialog
            barber={barber}
            trigger={
              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                <Pencil className="size-3.5" /> Düzenle
              </DropdownMenuItem>
            }
          />
          <BarberPhotosDialog
            barber={barber}
            photos={photos}
            trigger={
              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                <Images className="size-3.5" /> Çalışmalar
              </DropdownMenuItem>
            }
          />
          <DropdownMenuItem variant="destructive" onSelect={() => setConfirmOpen(true)}>
            <Trash2 className="size-3.5" /> Sil
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{barber.name} silinsin mi?</DialogTitle>
            <DialogDescription>Bu işlem geri alınamaz. Randevu geçmişi olan berberleri silmek yerine pasif yapmanız önerilir.</DialogDescription>
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
    </>
  );
}
