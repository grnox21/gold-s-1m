"use client";

import { useState } from "react";
import { CalendarClock, CheckCircle2, MoreHorizontal, Trash2, UserX, XCircle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { RescheduleDialog } from "./reschedule-dialog";
import {
  adminCancelAppointment,
  adminDeleteAppointment,
  adminMarkCompleted,
  adminMarkNoShow,
} from "@/app/giris/(protected)/randevular/actions";
import type { Appointment, Barber } from "@/types/database";

export function AppointmentRowActions({
  appointment,
  barbers,
  isOwner,
}: {
  appointment: Appointment;
  barbers: Barber[];
  isOwner: boolean;
}) {
  const [cancelOpen, setCancelOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const isTerminal = appointment.status === "cancelled" || appointment.status === "completed" || appointment.status === "no_show";

  async function run(action: () => Promise<{ ok: boolean; error?: string }>, successMsg: string) {
    setBusy(true);
    const result = await action();
    setBusy(false);
    if (!result.ok) {
      toast.error(result.error ?? "Bir hata oluştu.");
      return;
    }
    toast.success(successMsg);
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" disabled={busy}>
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem disabled={isTerminal} onSelect={() => setRescheduleOpen(true)}>
            <CalendarClock className="size-3.5" /> Yeniden Planla
          </DropdownMenuItem>
          <DropdownMenuItem disabled={isTerminal} onSelect={() => run(() => adminMarkCompleted(appointment.id), "Tamamlandı olarak işaretlendi.")}>
            <CheckCircle2 className="size-3.5" /> Tamamlandı Olarak İşaretle
          </DropdownMenuItem>
          <DropdownMenuItem disabled={isTerminal} onSelect={() => run(() => adminMarkNoShow(appointment.id), "Gelmedi olarak işaretlendi.")}>
            <UserX className="size-3.5" /> Gelmedi Olarak İşaretle
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" disabled={isTerminal} onSelect={() => setCancelOpen(true)}>
            <XCircle className="size-3.5" /> İptal Et
          </DropdownMenuItem>
          {/* Delete is owner-only — the server action re-checks this too,
              this is just so a non-owner admin/barber doesn't see an
              option that would just error. Separate from "İptal Et" above:
              that only changes status and keeps the record; this removes
              the row entirely. */}
          {isOwner && (
            <DropdownMenuItem variant="destructive" onSelect={() => setDeleteOpen(true)}>
              <Trash2 className="size-3.5" /> Kaydı Sil
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Randevu iptal edilsin mi?</DialogTitle>
            <DialogDescription>
              {appointment.customer_name} — {new Date(appointment.start_at).toLocaleString("tr-TR")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Vazgeç</Button>
            </DialogClose>
            <Button
              variant="destructive"
              disabled={busy}
              onClick={async () => {
                await run(() => adminCancelAppointment(appointment.id, "admin_iptal"), "Randevu iptal edildi.");
                setCancelOpen(false);
              }}
            >
              Evet, İptal Et
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bu randevu kaydı silinsin mi?</DialogTitle>
            <DialogDescription>
              {appointment.customer_name} — {new Date(appointment.start_at).toLocaleString("tr-TR")}. Bu işlem geri
              alınamaz; kayıt Randevular ve Takvim&apos;den tamamen kaldırılır.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Vazgeç</Button>
            </DialogClose>
            <Button
              variant="destructive"
              disabled={busy}
              onClick={async () => {
                await run(() => adminDeleteAppointment(appointment.id), "Randevu kaydı silindi.");
                setDeleteOpen(false);
              }}
            >
              Evet, Sil
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <RescheduleDialog appointment={appointment} barbers={barbers} open={rescheduleOpen} onOpenChange={setRescheduleOpen} />
    </>
  );
}
