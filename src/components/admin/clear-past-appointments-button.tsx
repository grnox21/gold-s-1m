"use client";

import { useState } from "react";
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
import { clearPastAppointments } from "@/app/giris/(protected)/randevular/actions";

export function ClearPastAppointmentsButton({ count, isOwner }: { count: number; isOwner: boolean }) {
  const [open, setOpen] = useState(false);
  const [clearing, setClearing] = useState(false);

  if (count === 0) return null;
  // Delete is owner-only — the server action re-checks this too, this is
  // just so a non-owner admin doesn't see a button that would just error.
  if (!isOwner) return null;

  async function handleClear() {
    setClearing(true);
    const result = await clearPastAppointments();
    setClearing(false);
    if (!result.ok) {
      toast.error(result.error ?? "Silinemedi.");
      return;
    }
    toast.success("Geçmiş randevular silindi.");
    setOpen(false);
  }

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Trash2 className="size-3.5" /> Geçmiş Randevuları Sil
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{count} geçmiş randevu silinsin mi?</DialogTitle>
            <DialogDescription>
              Başlangıç saati geçmiş olan tüm randevular (durumu ne olursa olsun) kalıcı olarak silinecek.
              Gelecekteki randevular etkilenmez. Bu işlem geri alınamaz.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Vazgeç</Button>
            </DialogClose>
            <Button variant="destructive" onClick={handleClear} disabled={clearing}>
              {clearing ? "Siliniyor…" : "Evet, Sil"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
