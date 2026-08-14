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
import { deleteCustomer } from "@/app/giris/(protected)/musteriler/actions";
import type { Customer } from "@/types/database";

/** Delete is owner-only — the server action re-checks this too, this is
 * just so a non-owner admin doesn't see a button that would just error.
 * Parent page only renders this component at all when isOwner is true. */
export function CustomerRowActions({ customer }: { customer: Customer }) {
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    const result = await deleteCustomer(customer.id);
    setDeleting(false);
    if (!result.ok) {
      toast.error(result.error ?? "Silinemedi.");
      return;
    }
    toast.success("Müşteri kaydı silindi.");
    setOpen(false);
  }

  return (
    <>
      <Button type="button" variant="ghost" size="icon" onClick={() => setOpen(true)} aria-label="Müşteriyi sil">
        <Trash2 className="size-3.5" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{customer.full_name} silinsin mi?</DialogTitle>
            <DialogDescription>
              Bu işlem geri alınamaz. Geçmiş ve gelecek randevuları etkilenmez — kendi içinde müşteri
              adı/telefonunu zaten ayrıca tutuyor, Randevular ve Takvim&apos;de görünmeye devam eder.
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
    </>
  );
}
