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
import { clearAllCustomers } from "@/app/giris/(protected)/musteriler/actions";

export function ClearCustomersButton({ count }: { count: number }) {
  const [open, setOpen] = useState(false);
  const [clearing, setClearing] = useState(false);

  async function handleClear() {
    setClearing(true);
    const result = await clearAllCustomers();
    setClearing(false);
    if (!result.ok) {
      toast.error(result.error ?? "Silinemedi.");
      return;
    }
    toast.success("Müşteri kayıtları silindi.");
    setOpen(false);
  }

  if (count === 0) return null;

  return (
    <>
      <Button type="button" variant="destructive" size="sm" onClick={() => setOpen(true)}>
        <Trash2 className="size-3.5" /> Tüm Kayıtları Sil
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{count} müşteri kaydı silinsin mi?</DialogTitle>
            <DialogDescription>
              Müşteri listesi tamamen boşalacak. Geçmiş ve gelecek randevular etkilenmez — hepsi kendi
              içinde müşteri adı/telefonunu zaten ayrıca tutuyor, Randevular ve Takvim&apos;de görünmeye devam
              eder. Bu işlem geri alınamaz.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Vazgeç</Button>
            </DialogClose>
            <Button variant="destructive" onClick={handleClear} disabled={clearing}>
              {clearing ? "Siliniyor…" : "Evet, Hepsini Sil"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
